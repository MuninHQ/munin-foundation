const SENSITIVE_FIELD = /(?:authorization|api[_-]?key|access[_-]?key|client[_-]?secret|refresh[_-]?token|session[_-]?key|passwords?|passwd|secrets?|tokens?|credentials?)$/i;
const AUTHORIZATION_CREDENTIAL = /(\bauthorization\b["']?\s*[:=]\s*(?:bearer|basic)\s+)[^\s,;}&"']+/gi;
const AUTHORIZATION_OPAQUE = /(\bauthorization\b["']?\s*[:=]\s*)(?!(?:bearer|basic)\b)[^\s,;}&"']+/gi;
const STANDALONE_BEARER = /\bbearer\s+[A-Za-z0-9._~+/=-]+/gi;
const SECRET_ASSIGNMENT = /(\b(?:api[_-]?key|access[_-]?key|secret[_-]?access[_-]?key|client[_-]?secret|(?:access|refresh|id)[_-]?token|session[_-]?key|password|passwd|secret|token|credential)\b["']?\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;}&]+)/gi;

const SENSITIVE_TEXT_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  ['private-key', /-----begin (?:rsa |ec |openssh |encrypted )?private key-----/i],
  ['client-secret', /\bclient[_ -]?secret\b\s*[:=]\s*(?:"[^"\r\n]+"|'[^'\r\n]+'|[^\s,;}&]+)/i],
  ['api-key', /\b(?:api[_ -]?key|access[_ -]?key|secret[_ -]?(?:access[_ -]?)?key)\b\s*[:=]\s*(?:"[^"\r\n]+"|'[^'\r\n]+'|[^\s,;}&]+)/i],
  ['access-token', /\b(?:access|refresh|id|session)[_ -]?tokens?\b\s*[:=]\s*(?:"[^"\r\n]+"|'[^'\r\n]+'|[^\s,;}&]+)/i],
  ['authorization-basic', /\bauthorization\b["']?\s*[:=]\s*basic\s+[a-z0-9+/]{4,}={0,2}\b/i],
  ['bearer-token', /\bbearer\s+[a-z0-9._~+\/-]{12,}={0,2}\b/i],
  ['jwt-token', /\beyJ[a-z0-9_-]{5,}\.[a-z0-9_-]{5,}\.[a-z0-9_-]{5,}\b/i],
  ['provider-token', /\b(?:sk-(?:proj-)?[a-z0-9_-]{12,}|gh[pousr]_[a-z0-9]{20,}|github_pat_[a-z0-9_]{20,}|glpat-[a-z0-9_-]{12,}|xox[baprs]-[a-z0-9-]{12,})\b/i],
  ['password', /\b(?:password|passwd|senha)\b\s*[:=]\s*(?:"[^"\r\n]+"|'[^'\r\n]+'|[^\s,;}&]{4,})/i],
  ['otp', /\b(?:otp|2fa|verification code|código de verificação|codigo de verificacao)\b\s*[:=]?\s*\d{4,10}\b/i],
];

export function sensitiveTextClasses(value: string): string[] {
  return SENSITIVE_TEXT_PATTERNS.filter(([, pattern]) => pattern.test(value)).map(([label]) => label);
}

export function redactSecretText(value: string): string {
  return value
    .replace(AUTHORIZATION_CREDENTIAL, '$1[REDACTED]')
    .replace(AUTHORIZATION_OPAQUE, '$1[REDACTED]')
    .replace(STANDALONE_BEARER, 'Bearer [REDACTED]')
    .replace(SECRET_ASSIGNMENT, '$1[REDACTED]');
}

export function redactSecrets<T>(value: T): T {
  const seen = new WeakSet<object>();
  const visit = (item: unknown, key?: string): unknown => {
    if (key && SENSITIVE_FIELD.test(key)) return '[REDACTED]';
    if (typeof item === 'string') return redactSecretText(item);
    if (!item || typeof item !== 'object') return item;
    if (seen.has(item)) return '[REDACTED:CIRCULAR]';
    seen.add(item);
    if (Array.isArray(item)) return item.map(entry => visit(entry));
    if (item instanceof Date) return item.toISOString();
    return Object.fromEntries(Object.entries(item as Record<string, unknown>).map(([childKey, child]) => [childKey, visit(child, childKey)]));
  };
  return visit(value) as T;
}
