const SENSITIVE_FIELD = /(?:authorization|api[_-]?key|access[_-]?key|client[_-]?secret|refresh[_-]?token|session[_-]?key|passwords?|passwd|secrets?|tokens?|credentials?)$/i;
const AUTHORIZATION_CREDENTIAL = /(\bauthorization\b["']?\s*[:=]\s*(?:bearer|basic)\s+)[^\s,;}&"']+/gi;
const AUTHORIZATION_OPAQUE = /(\bauthorization\b["']?\s*[:=]\s*)(?!(?:bearer|basic)\b)[^\s,;}&"']+/gi;
const STANDALONE_BEARER = /\bbearer\s+[A-Za-z0-9._~+/=-]+/gi;
const SECRET_ASSIGNMENT = /(\b(?:api[_-]?key|access[_-]?key|secret[_-]?access[_-]?key|client[_-]?secret|(?:access|refresh|id)[_-]?token|session[_-]?key|password|passwd|secret|token|credential)\b["']?\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;}&]+)/gi;

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
