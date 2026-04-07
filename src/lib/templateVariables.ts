/**
 * Interpolação de placeholders `{{nome}}` em strings e estruturas JSON-like.
 * Usável no front (Vite) e no backend (Node): sem dependência de `window` ou `import.meta`.
 */

/** Mapa nome → valor substituído; só chaves presentes aqui são interpoladas. */
export type TemplateVariableMap = Record<string, string>;

const PLACEHOLDER_RE = /\{\{([a-zA-Z][a-zA-Z0-9]*)\}\}/g;

/**
 * Chaves de template suportadas na V1 (alinhado à herança Estilo 1 / `STUDIO_TEMPLATE_VARIABLE_KEYS_V1`).
 */
export const SUPPORTED_TEMPLATE_VARIABLE_KEYS = [
  'brand',
  'city',
  'siteUrl',
  'whatsappE164',
  'yearsInMarket',
  'projectCount',
] as const;

export type SupportedTemplateVariableKey = (typeof SUPPORTED_TEMPLATE_VARIABLE_KEYS)[number];

/**
 * Lista as variáveis de template suportadas pelo motor de interpolação.
 */
export function extractSupportedTemplateVariables(): readonly SupportedTemplateVariableKey[] {
  return SUPPORTED_TEMPLATE_VARIABLE_KEYS;
}

/**
 * Substitui apenas placeholders cujo nome existe em `variables`.
 * Demais `{{...}}` permanecem na string.
 */
export function resolveTemplateVariablesInString(
  text: string,
  variables: TemplateVariableMap,
): string {
  return text.replace(PLACEHOLDER_RE, (full, name: string) => {
    if (Object.prototype.hasOwnProperty.call(variables, name)) {
      return variables[name];
    }
    return full;
  });
}

/**
 * Aplica `resolveTemplateVariablesInString` em todas as strings, recursivamente em objetos e arrays.
 * Objetos não-plain (ex.: `Date`) são retornados sem alteração.
 */
export function resolveTemplateVariablesInObject<T>(input: T, variables: TemplateVariableMap): T {
  if (typeof input === 'string') {
    return resolveTemplateVariablesInString(input, variables) as T;
  }

  if (input === null || typeof input !== 'object') {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => resolveTemplateVariablesInObject(item, variables)) as T;
  }

  const proto = Object.getPrototypeOf(input);
  if (proto !== null && proto !== Object.prototype) {
    return input;
  }

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    out[key] = resolveTemplateVariablesInObject(value, variables);
  }
  return out as T;
}
