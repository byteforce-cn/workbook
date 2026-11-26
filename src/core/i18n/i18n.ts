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
  /** Placeholder for an empty value in read-only text mode (default `—`). */
  READONLY_EMPTY: "workbook.readonly.empty",
  /** Boolean rendering in read-only text mode (defaults `是` / `否`). */
  BOOLEAN_TRUE: "workbook.boolean.true",
  BOOLEAN_FALSE: "workbook.boolean.false",
  // ---- Document editor ----
  EDITOR_TOOLBAR: "workbook.editor.toolbar",
  EDITOR_BOLD: "workbook.editor.bold",
  EDITOR_ITALIC: "workbook.editor.italic",
  EDITOR_UNDERLINE: "workbook.editor.underline",
  EDITOR_STRIKETHROUGH: "workbook.editor.strikethrough",
  EDITOR_FONT_SIZE: "workbook.editor.fontsize",
  EDITOR_COLOR: "workbook.editor.color",
  EDITOR_LINK: "workbook.editor.link",
  EDITOR_ALIGN_LEFT: "workbook.editor.alignleft",
  EDITOR_ALIGN_CENTER: "workbook.editor.aligncenter",
  EDITOR_ALIGN_RIGHT: "workbook.editor.alignright",
  EDITOR_ALIGN_JUSTIFY: "workbook.editor.alignjustify",
  EDITOR_PARAGRAPH_STYLE: "workbook.editor.paragraphstyle",
  EDITOR_CHARACTER_STYLE: "workbook.editor.characterstyle",
  EDITOR_CLEAR_FORMAT: "workbook.editor.clearformat",
  EDITOR_INSERT_BIND: "workbook.editor.insertbind",
  EDITOR_BIND_PATH: "workbook.editor.bindpath",
  EDITOR_BIND_FORMAT: "workbook.editor.bindformat",
  EDITOR_BIND_PLACEHOLDER: "workbook.editor.bindplaceholder",
  EDITOR_INSERT: "workbook.editor.insert",
  EDITOR_CANCEL: "workbook.editor.cancel",
  EDITOR_DELETE: "workbook.editor.delete",
  EDITOR_SAVE: "workbook.editor.save",
  EDITOR_SAVED: "workbook.editor.saved",
  EDITOR_DIRTY: "workbook.editor.dirty",
  EDITOR_INSERT_PAGE_BREAK: "workbook.editor.insertpagebreak",
  EDITOR_INSERT_TABLE: "workbook.editor.inserttable",
  EDITOR_TABLE_ADD_ROW: "workbook.editor.tableaddrow",
  EDITOR_TABLE_DELETE_ROW: "workbook.editor.tabledeleterow",
  EDITOR_TABLE_ADD_COLUMN: "workbook.editor.tableaddcolumn",
  EDITOR_TABLE_DELETE_COLUMN: "workbook.editor.tabledeletecolumn",
  EDITOR_TABLE_MERGE: "workbook.editor.tablemerge",
  EDITOR_TABLE_SPLIT: "workbook.editor.tablesplit",
  EDITOR_PREVIEW: "workbook.editor.preview",
  EDITOR_EDIT: "workbook.editor.edit",
  EDITOR_SIMULATE_CONDITIONS: "workbook.editor.simulateconditions",
  EDITOR_PREVIEW_NOTICE: "workbook.editor.previewnotice",
  EDITOR_HEADER: "workbook.editor.header",
  EDITOR_FOOTER: "workbook.editor.footer",
  EDITOR_WATERMARK: "workbook.editor.watermark",
  EDITOR_FLOATING: "workbook.editor.floating",
  EDITOR_ADD: "workbook.editor.add",
  EDITOR_TEXT: "workbook.editor.text",
  EDITOR_OPACITY: "workbook.editor.opacity",
  EDITOR_ROTATION: "workbook.editor.rotation",
  EDITOR_REPEAT: "workbook.editor.repeat",
  EDITOR_IMAGE: "workbook.editor.image",
  EDITOR_X: "workbook.editor.x",
  EDITOR_Y: "workbook.editor.y",
  EDITOR_WIDTH: "workbook.editor.width",
  EDITOR_HEIGHT: "workbook.editor.height",
  EDITOR_ZOOM: "workbook.editor.zoom",
  EDITOR_SAVE_ERROR: "workbook.editor.saveerror",
  EDITOR_ALIGNMENT: "workbook.editor.alignment",
  EDITOR_FIRST_PAGE: "workbook.editor.firstpage",
  EDITOR_ODD_PAGES: "workbook.editor.oddpages",
  EDITOR_EVEN_PAGES: "workbook.editor.evenpages",
  EDITOR_STYLE: "workbook.editor.style",
} as const;
