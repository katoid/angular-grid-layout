/* eslint-disable */
/**
 * Type describing the allowed values for a boolean input.
 * @docs-private
 */
export type BooleanInput = string | boolean | null | undefined;

/** Coerces a data-bound value (typically a string) to a boolean. */
export function coerceBooleanProperty(value: any): boolean {
  return value != null && `${value}` !== 'false';
}
