import type { Page } from "@playwright/test";

export const workbookStoryIds = {
  allViews: "workbook-documentrenderer--all-views",
  formEditable: "workbook-documentrenderer--form-editable",
  pagePreview: "workbook-documentrenderer--page-preview",
  pagedPrintExport: "workbook-documentrenderer--paged-print-export",
  productionShowcase: "workbook-documentrenderer--production-showcase",
  sheetPreview: "workbook-documentrenderer--sheet-preview",
  remoteOptions: "workbook-option-sources--url-and-graphql-remote-options",
  quickBasics: "quick-start-simpleform--simple-form-basics",
  quickSelect: "quick-start-simpleform--simple-form-select",
  quickLayouts: "quick-start-simpleform--simple-form-layouts",
  syncValidators: "workbook-validation--sync-validators",
  asyncValidation: "workbook-validation--async-validation",
  conditionalValidation: "workbook-validation--conditional-validation",
  pluginCustomField: "workbook-plugin-system--custom-field",
  pluginCustomLayout: "workbook-plugin-system--custom-layout",
  pluginCustomValidation: "workbook-plugin-system--custom-validation",
  pluginCustomCondition: "workbook-plugin-system--custom-condition",
  runtimeI18n: "workbook-runtime--i-18-n",
  runtimeConditionEngine: "workbook-runtime--condition-engine",
  runtimeHookLifecycle: "workbook-runtime--hook-lifecycle",
  reactDataProvider: "workbook-react-integration--data-provider",
  reactPluginProvider: "workbook-react-integration--plugin-provider",
  reactErrorBoundary: "workbook-react-integration--error-boundary",
  pageWatermarks: "workbook-page--watermarks",
  pageHeadersFooters: "workbook-page--headers-footers",
  pageFloatingBlocks: "workbook-page--floating-blocks",
  pageComplexTables: "workbook-page--complex-tables",
  sheetFrozenPanes: "workbook-sheet--frozen-panes",
  sheetFormulas: "workbook-sheet--formulas",
  sheetVirtualScroll: "workbook-sheet--virtual-scroll",
  sheetStretchWidth: "workbook-sheet--stretch-to-width",
  deviceForm: "workbook-device--responsive-form",
  devicePage: "workbook-device--responsive-page",
  deviceSheet: "workbook-device--responsive-sheet",
  deviceAuto: "workbook-device--auto-detect",
  rowFieldSpan: "workbook-layout--row-field-span",
} as const;

export function storyUrl(id: string) {
  return `/iframe.html?id=${id}&viewMode=story`;
}

export async function openStory(page: Page, id: string) {
  await page.goto(storyUrl(id));
}
