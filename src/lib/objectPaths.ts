/**
 * Utilitários puros para paths em objetos aninhados (ex.: `hero.headline`, `seo.title`).
 * Segmentos numéricos tratam arrays por índice (`items.0.title`).
 * Sem lodash; seguro para uso em browser e Node.
 */

export class PathParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PathParseError';
  }
}

export class PathSetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PathSetError';
  }
}

export type ListLeafPathsOptions = {
  /**
   * Se true, arrays não são expandidos: a path termina no array inteiro
   * (adequado a blocos como `hero.stats` na herança por campo).
   * @default false
   */
  arraysAsLeaves?: boolean;
  /**
   * Incluir `{}` vazios como folha (path para o objeto vazio).
   * @default false
   */
  includeEmptyObjects?: boolean;
  /**
   * Limite de segmentos em cada path emitida (contando a partir da raiz).
   * Ex.: `maxDepth: 1` só lista chaves de primeiro nível.
   */
  maxDepth?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parsePathSegments(path: string): string[] {
  const trimmed = path.trim();
  if (!trimmed) {
    throw new PathParseError('Path vazio');
  }
  const parts = trimmed.split('.');
  for (const p of parts) {
    if (p === '') {
      throw new PathParseError(`Segmento inválido em "${path}"`);
    }
  }
  return parts;
}

function segmentCountForPath(path: string): number {
  if (!path) {
    return 0;
  }
  return path.split('.').length;
}

function readChild(container: unknown, segment: string): unknown {
  if (container === null || container === undefined) {
    return undefined;
  }
  if (Array.isArray(container)) {
    const index = parseArrayIndex(segment);
    if (index === null || index < 0 || index >= container.length) {
      return undefined;
    }
    return container[index];
  }
  if (isRecord(container) && Object.prototype.hasOwnProperty.call(container, segment)) {
    return container[segment];
  }
  return undefined;
}

function parseArrayIndex(segment: string): number | null {
  if (!/^\d+$/.test(segment)) {
    return null;
  }
  const n = Number(segment);
  return Number.isSafeInteger(n) ? n : null;
}

function shouldCreateArrayForNextSegment(nextSegment: string | undefined): boolean {
  return nextSegment !== undefined && /^\d+$/.test(nextSegment);
}

function createEmptyChildForNextSegment(nextSegment: string): unknown {
  return shouldCreateArrayForNextSegment(nextSegment) ? [] : {};
}

/**
 * Obtém o valor em `path` (notação com pontos). Retorna `undefined` se a path não existir.
 */
export function getValueAtPath(obj: unknown, path: string): unknown {
  const segments = parsePathSegments(path);
  let current: unknown = obj;
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const isLast = i === segments.length - 1;
    current = readChild(current, segment);
    if (current === undefined && !isLast) {
      return undefined;
    }
  }
  return current;
}

/**
 * Indica se a path existe no sentido de `hasOwnProperty` / índice de array válido.
 * Valores `undefined` explícitos em objeto ainda contam como existentes.
 */
export function hasValueAtPath(obj: unknown, path: string): boolean {
  const segments = parsePathSegments(path);
  if (segments.length === 0) {
    return false;
  }
  let current: unknown = obj;
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const last = i === segments.length - 1;
    if (current === null || current === undefined) {
      return false;
    }
    if (Array.isArray(current)) {
      const index = parseArrayIndex(segment);
      if (index === null || index < 0 || index >= current.length) {
        return false;
      }
      if (last) {
        return true;
      }
      current = current[index];
      continue;
    }
    if (isRecord(current)) {
      if (!Object.prototype.hasOwnProperty.call(current, segment)) {
        return false;
      }
      if (last) {
        return true;
      }
      current = current[segment];
      continue;
    }
    return false;
  }
  return false;
}

function immSetShallow(
  container: unknown,
  segment: string,
  value: unknown,
): unknown {
  if (Array.isArray(container)) {
    const index = parseArrayIndex(segment);
    if (index === null) {
      throw new PathSetError(`Segmento "${segment}" não é índice válido em array`);
    }
    const copy = [...container];
    while (copy.length <= index) {
      copy.push(undefined);
    }
    copy[index] = value;
    return copy;
  }
  if (container === undefined) {
    if (parseArrayIndex(segment) !== null) {
      const index = parseArrayIndex(segment)!;
      const arr: unknown[] = [];
      while (arr.length <= index) {
        arr.push(undefined);
      }
      arr[index] = value;
      return arr;
    }
    return { [segment]: value };
  }
  if (container === null) {
    throw new PathSetError('Não é possível definir valor em null');
  }
  if (isRecord(container)) {
    return { ...container, [segment]: value };
  }
  throw new PathSetError('Não é possível definir valor em tipo não-objeto');
}

function immSetAt(container: unknown, segments: string[], value: unknown): unknown {
  if (segments.length === 0) {
    return value;
  }
  const [head, ...tail] = segments;
  if (tail.length === 0) {
    return immSetShallow(container, head, value);
  }

  let child = readChild(container, head);
  if (child !== null && child !== undefined && typeof child !== 'object') {
    throw new PathSetError(
      `Não é possível atravessar valor não-objeto em "${head}"`,
    );
  }
  if (child === undefined || child === null) {
    child = createEmptyChildForNextSegment(tail[0]);
  }
  const newChild = immSetAt(child, tail, value);
  return immSetShallow(container, head, newChild);
}

/**
 * Retorna um novo objeto/array com o valor definido em `path` (cópia estrutural ao longo da path).
 * Se `obj` for `null` ou `undefined`, parte de `{}`.
 */
export function setValueAtPath(obj: unknown, path: string, value: unknown): unknown {
  const segments = parsePathSegments(path);
  const base = obj === null || obj === undefined ? {} : obj;
  return immSetAt(base, segments, value);
}

function immUnsetAt(container: unknown, segments: string[]): unknown {
  if (segments.length === 0) {
    return container;
  }
  const [head, ...tail] = segments;
  if (tail.length === 0) {
    if (container === null || container === undefined) {
      return container;
    }
    if (Array.isArray(container)) {
      const index = parseArrayIndex(head);
      if (index === null) {
        throw new PathSetError(`Segmento "${head}" não é índice válido em array`);
      }
      return container.filter((_, i) => i !== index);
    }
    if (isRecord(container)) {
      if (!Object.prototype.hasOwnProperty.call(container, head)) {
        return { ...container };
      }
      const { [head]: _removed, ...rest } = container;
      return rest;
    }
    return container;
  }

  const child = readChild(container, head);
  if (child === undefined || child === null || typeof child !== 'object') {
    if (Array.isArray(container) || isRecord(container)) {
      return Array.isArray(container) ? [...container] : { ...container };
    }
    return container;
  }
  const newChild = immUnsetAt(child, tail);
  if (newChild === child) {
    return Array.isArray(container) ? [...container] : isRecord(container) ? { ...container } : container;
  }
  return immSetShallow(container, head, newChild);
}

/**
 * Remove o valor na última segmenta da path (imutável).
 * Em arrays, remove o índice e **compacta** (sem buracos).
 */
export function unsetValueAtPath(obj: unknown, path: string): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }
  const segments = parsePathSegments(path);
  return immUnsetAt(obj, segments);
}

function collectLeafPaths(
  value: unknown,
  basePath: string,
  options: Required<Pick<ListLeafPathsOptions, 'arraysAsLeaves' | 'includeEmptyObjects'>> & {
    maxDepth: number | undefined;
  },
): string[] {
  const depth = segmentCountForPath(basePath);
  const { maxDepth, arraysAsLeaves, includeEmptyObjects } = options;

  if (maxDepth !== undefined && depth >= maxDepth) {
    return basePath ? [basePath] : [];
  }

  if (value === null || typeof value !== 'object') {
    return basePath ? [basePath] : [];
  }

  if (Array.isArray(value)) {
    if (arraysAsLeaves) {
      return basePath ? [basePath] : [];
    }
    if (value.length === 0) {
      return basePath ? [basePath] : [];
    }
    const out: string[] = [];
    for (let i = 0; i < value.length; i++) {
      const childPath = basePath === '' ? String(i) : `${basePath}.${i}`;
      out.push(
        ...collectLeafPaths(value[i], childPath, {
          ...options,
        }),
      );
    }
    return out.sort();
  }

  if (isRecord(value)) {
    const keys = Object.keys(value).sort();
    if (keys.length === 0) {
      if (includeEmptyObjects && basePath) {
        return [basePath];
      }
      return [];
    }
    const out: string[] = [];
    for (const key of keys) {
      const childPath = basePath === '' ? key : `${basePath}.${key}`;
      const nextDepth = segmentCountForPath(childPath);
      const child = value[key];
      if (
        maxDepth !== undefined &&
        nextDepth >= maxDepth &&
        child !== null &&
        typeof child === 'object'
      ) {
        out.push(childPath);
        continue;
      }
      out.push(
        ...collectLeafPaths(child, childPath, {
          ...options,
        }),
      );
    }
    return out.sort();
  }

  return basePath ? [basePath] : [];
}

/**
 * Lista paths até folhas primitivas ou `null`.
 * Use `arraysAsLeaves: true` para tratar cada array como unidade (ex.: override de `hero.stats`).
 */
export function listLeafPaths(obj: unknown, options?: ListLeafPathsOptions): string[] {
  const merged: Required<Pick<ListLeafPathsOptions, 'arraysAsLeaves' | 'includeEmptyObjects'>> & {
    maxDepth: number | undefined;
  } = {
    arraysAsLeaves: options?.arraysAsLeaves ?? false,
    includeEmptyObjects: options?.includeEmptyObjects ?? false,
    maxDepth: options?.maxDepth,
  };
  if (obj === null || typeof obj !== 'object') {
    return [];
  }
  return collectLeafPaths(obj, '', merged);
}
