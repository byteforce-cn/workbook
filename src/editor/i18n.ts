import { resolveBuiltInText, WORKBOOK_I18N_KEYS } from "../core/i18n/i18n";
import { useWorkbookRuntime } from "../react/RuntimeProvider";

export type EditorTextKey = keyof typeof WORKBOOK_I18N_KEYS;

/** Resolve an editor label through the host i18n dictionary. */
export function useEditorText(key: EditorTextKey, fallback: string): string {
  const { locale, i18n, fallbackLocale } = useWorkbookRuntime();
  return resolveBuiltInText(WORKBOOK_I18N_KEYS[key], locale, i18n, fallbackLocale, fallback);
}
