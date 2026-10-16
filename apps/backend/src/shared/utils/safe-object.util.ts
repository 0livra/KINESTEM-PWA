/**
 * KINESTEM - Utilidades de Seguridad de Objetos
 * Protege contra Prototype Pollution e inyección NoSQL.
 * OWASP A03:2021 / A08:2021
 */

export function createSafeDict<V = unknown>(): Record<string, V> {
  return Object.create(null) as Record<string, V>;
}

export function safeHasOwn(obj: object, key: PropertyKey): boolean {
  return Object.hasOwn(obj, key);
}

export function deepFreeze<T extends object>(obj: T): Readonly<T> {
  for (const key of Reflect.ownKeys(obj)) {
    const val = (obj as Record<string | symbol, unknown>)[key];
    if (val !== null && typeof val === 'object' && !Object.isFrozen(val)) {
      deepFreeze(val as object);
    }
  }
  return Object.freeze(obj);
}

export function sanitizeObjectKeys<T>(input: T): T {
  if (input === null || typeof input !== 'object') return input;
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeObjectKeys(item)) as unknown as T;
  }
  const clean = createSafeDict<unknown>();
  const BLOCKED = new Set(['__proto__', 'constructor', 'prototype']);
  for (const key of Object.keys(input as object)) {
    if (BLOCKED.has(key)) continue;
    clean[key] = sanitizeObjectKeys((input as Record<string, unknown>)[key]);
  }
  return clean as T;
}

export function sanitizeNoSqlOperators<T>(input: T): T {
  if (input === null || typeof input !== 'object') return input;
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeNoSqlOperators(item)) as unknown as T;
  }
  const clean = createSafeDict<unknown>();
  for (const key of Object.keys(input as object)) {
    if (key.startsWith('$') || key.includes('.')) continue;
    clean[key] = sanitizeNoSqlOperators((input as Record<string, unknown>)[key]);
  }
  return clean as T;
}
