/**
 * Dev-time parameter tuning type system.
 * Discriminated union ensures TypeScript prevents invalid combinations.
 */

interface ParamBase {
  /** Unique key within component, e.g. "underlineThickness" */
  key: string;
  /** Human-readable label, e.g. "Underline Thickness" */
  label: string;
  /** Whether this is a CSS (instant) or JS (commit-required) param */
  tier?: "css" | "js";
}

export interface NumberParamDef extends ParamBase {
  type: "number";
  value: number;
  min: number;
  max: number;
  step: number;
  /** Unit label: "px", "ms", "%", "deg" */
  unit?: string;
}

export interface ColorParamDef extends ParamBase {
  type: "color";
  value: string;
}

export interface BooleanParamDef extends ParamBase {
  type: "boolean";
  value: boolean;
}

export type ParamDef = NumberParamDef | ColorParamDef | BooleanParamDef;

/** Derive value type from ParamDef discriminant — single source of truth */
type ExtractParamValue<T extends ParamDef["type"]> = Extract<
  ParamDef,
  { type: T }
>["value"];

/**
 * Type-safe value extraction with runtime validation.
 */
export function getParamValue<K extends ParamDef["type"]>(
  params: ParamDef[],
  key: string,
  expectedType: K,
): ExtractParamValue<K> {
  const param = params.find((d) => d.key === key);
  if (!param) throw new Error(`[dev-params] Missing param: "${key}"`);
  if (param.type !== expectedType) {
    throw new Error(
      `[dev-params] Param "${key}" is type "${param.type}", expected "${expectedType}"`,
    );
  }
  return param.value as ExtractParamValue<K>;
}

/**
 * Factory that creates a typed accessor for a component's params.
 * Components use: `const p = createParamAccessor(params);`
 * Then: `p('underlineThickness', 'number')` or `p('underlineThickness', 'number', overrides)`
 */
export function createParamAccessor(params: ParamDef[]) {
  function p(
    key: string,
    type: "number",
    overrides?: Record<string, number | string | boolean>,
  ): number;
  function p(
    key: string,
    type: "color",
    overrides?: Record<string, number | string | boolean>,
  ): string;
  function p(
    key: string,
    type: "boolean",
    overrides?: Record<string, number | string | boolean>,
  ): boolean;
  function p(
    key: string,
    type: ParamDef["type"],
    overrides?: Record<string, number | string | boolean>,
  ) {
    if (overrides?.[key] !== undefined) return overrides[key];
    return getParamValue(params, key, type);
  }
  return p;
}
