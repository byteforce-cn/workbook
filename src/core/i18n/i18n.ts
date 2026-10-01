/**
 * Framework-agnostic i18n text resolution.
 * Resolves `@:key` prefixed strings against locale dictionaries.
 */

import type { WorkbookI18n } from "../../core/types";

function readTranslation(dictionary: Record<string, string | undefined> | undefined, path: string): string | undefined {
  return dictionary?.[path];
}

export function resolveI18nText(
  value: string | undefined,
  locale: string | undefined,
  dictionary: WorkbookI18n | undefined,
  fallbackLocale = "en-US",
): string | undefined {
  if (value == null || !value.startsWith("@:")) {
    return value;
  }

  const key = value.slice(2);
  return (
    readTranslation(dictionary?.[locale ?? fallbackLocale], key) ??
    readTranslation(dictionary?.[fallbackLocale], key) ??
    value
  );
}

/**
 * Resolves a built-in text key through the i18n dictionary.
 * If no translation is found, returns the provided default value.
 *
 * @example
 * resolveBuiltInText("workbook.steps.previous", locale, i18n, fallbackLocale, "上一步")
 * // Looks up "@:workbook.steps.previous" in i18n, falls back to "上一步"
 */
export function resolveBuiltInText(
  i18nKey: string,
  locale: string | undefined,
  dictionary: WorkbookI18n | undefined,
  fallbackLocale: string | undefined,
  defaultText: string,
): string {
  const resolved = resolveI18nText(`@:${i18nKey}`, locale, dictionary, fallbackLocale);
  // If the result still starts with "@:", no translation was found — use default
  if (resolved == null || resolved.startsWith("@:")) {
    return defaultText;
  }
  return resolved;
}

/** Standard i18n keys for built-in workbook UI strings. */
export const WORKBOOK_I18N_KEYS = {
  FORM_SUBMIT: "workbook.form.submit",
  FORM_RESET: "workbook.form.reset",
  STEPS_PREVIOUS: "workbook.steps.previous",
  STEPS_NEXT: "workbook.steps.next",
  REPEAT_REMOVE: "workbook.repeat.remove",
  REPEAT_ADD: "workbook.repeat.add",
  SELECT_PLACEHOLDER: "workbook.select.placeholder",
  TABS_LABEL: "workbook.tabs.label",
  STEPS_LABEL: "workbook.steps.label",
} as const;
