export interface TokenEfficiencyConfig {
  enabled: boolean;
  telemetryEnabled: boolean;
  routerEnabled: boolean;
  budgetEnabled: boolean;
  compactionEnabled: boolean;
  checkpointEnabled: boolean;
  reportEnabled: boolean;
  promotionObservationEnabled: boolean;
  taskWarningTokens: number;
  taskCriticalTokens: number;
  sessionWarningTokens: number;
  sessionCriticalTokens: number;
  freshSessionTokens: number;
  warnings: readonly string[];
}

export const DEFAULT_TOKEN_EFFICIENCY_CONFIG: Readonly<TokenEfficiencyConfig> = Object.freeze({
  enabled: false,
  telemetryEnabled: true,
  routerEnabled: true,
  budgetEnabled: true,
  compactionEnabled: true,
  checkpointEnabled: true,
  reportEnabled: true,
  promotionObservationEnabled: true,
  taskWarningTokens: 32_000,
  taskCriticalTokens: 64_000,
  sessionWarningTokens: 128_000,
  sessionCriticalTokens: 224_000,
  freshSessionTokens: 272_000,
  warnings: Object.freeze([]),
});

export function loadTokenEfficiencyConfig(env: NodeJS.ProcessEnv = process.env): Readonly<TokenEfficiencyConfig> {
  const flag = (name: string, fallback: boolean) => env[name] === undefined ? fallback : env[name] === '1';
  const warnings: string[] = [];
  const integer = (name: string, fallback: number) => {
    if (env[name] === undefined) return fallback;
    const value = Number(env[name]);
    if (!Number.isInteger(value) || value < 1) {
      warnings.push(`${name} must be a positive integer; default thresholds applied.`);
      return fallback;
    }
    return value;
  };
  const thresholds = {
    taskWarningTokens: integer('MUNIN_TOKEN_TASK_WARNING_TOKENS', DEFAULT_TOKEN_EFFICIENCY_CONFIG.taskWarningTokens),
    taskCriticalTokens: integer('MUNIN_TOKEN_TASK_CRITICAL_TOKENS', DEFAULT_TOKEN_EFFICIENCY_CONFIG.taskCriticalTokens),
    sessionWarningTokens: integer('MUNIN_TOKEN_SESSION_WARNING_TOKENS', DEFAULT_TOKEN_EFFICIENCY_CONFIG.sessionWarningTokens),
    sessionCriticalTokens: integer('MUNIN_TOKEN_SESSION_CRITICAL_TOKENS', DEFAULT_TOKEN_EFFICIENCY_CONFIG.sessionCriticalTokens),
    freshSessionTokens: integer('MUNIN_TOKEN_FRESH_SESSION_TOKENS', DEFAULT_TOKEN_EFFICIENCY_CONFIG.freshSessionTokens),
  };
  const ordered = thresholds.taskWarningTokens < thresholds.taskCriticalTokens
    && thresholds.sessionWarningTokens < thresholds.sessionCriticalTokens
    && thresholds.sessionCriticalTokens <= thresholds.freshSessionTokens;
  if (!ordered) warnings.push('Token efficiency threshold ordering is invalid; default thresholds applied.');
  const safeThresholds = ordered ? thresholds : {
    taskWarningTokens: DEFAULT_TOKEN_EFFICIENCY_CONFIG.taskWarningTokens,
    taskCriticalTokens: DEFAULT_TOKEN_EFFICIENCY_CONFIG.taskCriticalTokens,
    sessionWarningTokens: DEFAULT_TOKEN_EFFICIENCY_CONFIG.sessionWarningTokens,
    sessionCriticalTokens: DEFAULT_TOKEN_EFFICIENCY_CONFIG.sessionCriticalTokens,
    freshSessionTokens: DEFAULT_TOKEN_EFFICIENCY_CONFIG.freshSessionTokens,
  };
  return Object.freeze({
    ...safeThresholds,
    enabled: flag('MUNIN_TOKEN_EFFICIENCY_ENABLED', false),
    telemetryEnabled: flag('MUNIN_TOKEN_EFFICIENCY_TELEMETRY_ENABLED', true),
    routerEnabled: flag('MUNIN_TOKEN_EFFICIENCY_ROUTER_ENABLED', true),
    budgetEnabled: flag('MUNIN_TOKEN_EFFICIENCY_BUDGET_ENABLED', true),
    compactionEnabled: flag('MUNIN_TOKEN_EFFICIENCY_COMPACTION_ENABLED', true),
    checkpointEnabled: flag('MUNIN_TOKEN_EFFICIENCY_CHECKPOINT_ENABLED', true),
    reportEnabled: flag('MUNIN_TOKEN_EFFICIENCY_REPORT_ENABLED', true),
    promotionObservationEnabled: flag('MUNIN_TOKEN_EFFICIENCY_PROMOTION_OBSERVATION_ENABLED', true),
    warnings: Object.freeze(warnings),
  });
}
