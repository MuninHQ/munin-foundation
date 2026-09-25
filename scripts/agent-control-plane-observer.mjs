import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const policyPath = process.argv[2] ?? 'agent-control-plane/policy.json';
const profilesDir = process.argv[3] ?? 'agent-control-plane/profiles';

const loadJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), 'utf8'));

export function inspectProfile(policy, profile, file = '<memory>') {
  const findings = [];
  const add = (code, detail) => findings.push({ file, code, detail });

  for (const field of policy.requiredProfileFields ?? []) {
    if (!(field in profile)) add('missing-required-field', field);
  }

  const authorized = new Set(profile.authorizedActions ?? []);
  const forbidden = new Set(profile.forbiddenActions ?? []);
  const trustedSources = new Set(profile.trustedInstructionSources ?? []);
  const untrustedSources = new Set(profile.untrustedContentSources ?? []);

  for (const action of authorized) {
    if (!(policy.canonicalActionClasses ?? []).includes(action)) {
      add('unknown-authorized-action', action);
    }
    if (forbidden.has(action)) add('action-both-authorized-and-forbidden', action);
  }

  for (const action of policy.consequentialActionClasses ?? []) {
    if (authorized.has(action)) add('consequential-action-authorized', action);
  }

  for (const action of policy.requiredForbiddenActions ?? []) {
    if (!forbidden.has(action)) add('required-forbidden-action-missing', action);
  }

  for (const source of policy.requiredUntrustedSources ?? []) {
    if (!untrustedSources.has(source)) {
      add('untrusted-source-not-declared', source);
    }
    if (trustedSources.has(source)) add('source-both-trusted-and-untrusted', source);
  }

  for (const trigger of policy.requiredEscalationTriggers ?? []) {
    if (!(profile.escalationTriggers ?? []).includes(trigger)) {
      add('missing-escalation-trigger', trigger);
    }
  }

  const authoritySurface = JSON.stringify({
    authorizedActions: profile.authorizedActions ?? [],
    trustedInstructionSources: profile.trustedInstructionSources ?? [],
    toolPolicy: profile.toolPolicy ?? {}
  }).toLowerCase();
  for (const pattern of policy.forbiddenAuthorityPatterns ?? []) {
    if (authoritySurface.includes(pattern.toLowerCase())) {
      add('forbidden-authority-pattern', pattern);
    }
  }

  if (typeof profile.memoryPolicy?.durablePromotion !== 'string') {
    add('durable-memory-promotion-policy-missing', 'Durable memory promotion policy must be explicit.');
  } else if (profile.memoryPolicy.durablePromotion === 'automatic') {
    add('automatic-durable-memory-promotion', 'Durable memory must require an explicit promotion path.');
  }

  if (typeof profile.memoryPolicy?.skillPromotion !== 'string') {
    add('skill-promotion-policy-missing', 'Skill promotion policy must be explicit.');
  } else if (profile.memoryPolicy.skillPromotion === 'automatic') {
    add('automatic-skill-promotion', 'Skills must pass the Munin promotion gate.');
  }

  if (profile.toolPolicy?.availabilityDoesNotImplyAuthority !== true) {
    add('tool-authority-boundary-not-explicit', 'Tool availability must not imply permission.');
  }

  if (profile.toolPolicy?.consequentialActionsUseExistingMuninGate !== true) {
    add('consequential-action-gate-not-required', 'Consequential actions must use the existing Munin approval gate.');
  }

  return findings;
}

export async function runObserver({ policyFile = policyPath, directory = profilesDir } = {}) {
  const policy = await loadJson(policyFile);
  if (policy.mode !== 'observe') {
    throw new Error(`Agent control plane observer only supports mode=observe; received ${policy.mode}`);
  }

  const absoluteDir = path.resolve(root, directory);
  const files = (await readdir(absoluteDir)).filter((name) => name.endsWith('.json')).sort();
  const results = [];

  for (const name of files) {
    const relative = path.join(directory, name).replaceAll('\\', '/');
    const profile = await loadJson(relative);
    results.push({ file: relative, profile: profile.id ?? name, findings: inspectProfile(policy, profile, relative) });
  }

  const findings = results.flatMap((result) => result.findings);
  return {
    mode: policy.mode,
    version: policy.version,
    profiles: results.length,
    findings: findings.length,
    results
  };
}

const isMain = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  runObserver()
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      // Observation findings are telemetry and intentionally do not fail CI.
      process.exitCode = 0;
    })
    .catch((error) => {
      process.stderr.write(`agent-control-plane observer error: ${error.message}\n`);
      // Invalid configuration/tooling means no trustworthy observation was produced.
      process.exitCode = 1;
    });
}
