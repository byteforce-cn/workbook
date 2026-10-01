import schemaJson from "./bf-schema-v4.1.1.json";

export type SupportStatus = "implemented" | "in-progress" | "planned";

export interface SupportMatrixEntry {
  definition: string;
  area: "schema" | "runtime" | "form" | "page" | "sheet" | "style" | "export";
  status: SupportStatus;
  /** 定义级之外、已被运行时消费的属性子集（如 `layoutField.span` 跨列） */
  supportedProperties?: string[];
}

const implementedDefinitions = new Set<string>([
  "assetMap",
  "bind",
  "border",
  "cellStyle",
  "characterStyle",
  "columnDef",
  "condition",
  "dependency",
  "fieldDefinition",
  "footerBlock",
  "floatingContentBlock",
  "floatingBlock",
  "formBlock",
  "formView",
  "headerBlock",
  "hexColor",
  "hook",
  "image",
  "inlineImage",
  "layoutConditional",
  "layoutCustom",
  "layoutField",
  "layoutGroup",
  "layoutHtml",
  "layoutNode",
  "layoutRepeat",
  "layoutRow",
  "layoutSteps",
  "layoutTabs",
  "lineBreak",
  "list",
  "listStyle",
  "localeString",
  "mappedSheetCell",
  "measurementOrPercent",
  "nonEmptyString",
  "nonNegativeNumber",
  "optionSource",
  "pageBreak",
  "pageCellBlock",
  "pageContentBlock",
  "pageSettings",
  "pageView",
  "paragraph",
  "paragraphStyle",
  "positiveNumber",
  "printConfig",
  "run",
  "sheetCell",
  "sheetImage",
  "sheetRow",
  "sheetView",
  "spreadsheetBlock",
  "styleCatalog",
  "table",
  "tableCell",
  "tableRow",
  "tableStyle",
  "textRun",
  "validation",
  "view",
  "watermarkBlock",
]);

const inProgressDefinitions = new Set<string>([]);

/** 属性级已实现标注：运行时（Web + RN）已消费的字段属性 */
const implementedProperties: Record<string, string[]> = {
  layoutField: ["span"],
};

function getArea(definition: string): SupportMatrixEntry["area"] {
  if (["bind", "condition", "dependency", "optionSource", "validation", "hook", "assetMap"].includes(definition)) {
    return "runtime";
  }

  if (
    definition.startsWith("layout") ||
    definition === "fieldDefinition" ||
    definition === "formBlock" ||
    definition === "formView"
  ) {
    return "form";
  }

  if (
    [
      "paragraph",
      "table",
      "tableRow",
      "tableCell",
      "image",
      "list",
      "pageView",
      "pageSettings",
      "pageContentBlock",
      "pageCellBlock",
      "pageBreak",
      "run",
      "textRun",
      "lineBreak",
      "inlineImage",
      "headerBlock",
      "footerBlock",
      "watermarkBlock",
      "floatingBlock",
      "floatingContentBlock",
      "spreadsheetBlock",
    ].includes(definition)
  ) {
    return "page";
  }

  if (["sheetView", "sheetRow", "sheetCell", "sheetImage", "columnDef", "mappedSheetCell"].includes(definition)) {
    return "sheet";
  }

  if (definition.endsWith("Style") || definition === "styleCatalog" || definition === "border") {
    return "style";
  }

  if (definition === "printConfig") {
    return "export";
  }

  return "schema";
}

export const workbookSupportMatrix: Record<string, SupportMatrixEntry> = Object.fromEntries(
  Object.keys(schemaJson.definitions)
    .sort((left, right) => left.localeCompare(right))
    .map((definition) => {
      const status: SupportStatus = implementedDefinitions.has(definition)
        ? "implemented"
        : inProgressDefinitions.has(definition)
          ? "in-progress"
          : "planned";

      return [
        definition,
        {
          definition,
          area: getArea(definition),
          status,
          ...(implementedProperties[definition] != null
            ? { supportedProperties: implementedProperties[definition] }
            : {}),
        },
      ];
    }),
);
