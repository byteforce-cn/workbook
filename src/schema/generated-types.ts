/**
 * This file is auto-generated from src/schema/bf-schema-v4.1.1.json.
 * Run `pnpm generate:types` to regenerate it. Do not edit manually.
 */

/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "localeString".
 */
export type LocaleString = string;
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "positiveNumber".
 */
export type PositiveNumber = number;
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "hexColor".
 */
export type HexColor = string;
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "nonNegativeNumber".
 */
export type NonNegativeNumber = number;
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "condition".
 */
export type Condition = {
  [k: string]: unknown | undefined;
} & {
  op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "contains" | "isEmpty" | "and" | "or" | "not" | "custom";
  path?: string;
  value?: unknown;
  conditions?: Condition[];
  condition?: Condition;
  name?: string;
  params?: {};
};
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "view".
 */
export type View = PageView | SheetView | FormView;
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "pageContentBlock".
 */
export type PageContentBlock =
  | Paragraph
  | Table
  | Image
  | List
  | PageBreak
  | FloatingBlock
  | SpreadsheetBlock
  | HeaderBlock
  | FooterBlock
  | WatermarkBlock;
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "run".
 */
export type Run = TextRun | LineBreak | InlineImage;
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "textRun".
 */
export type TextRun = TextRun1 & {
  type: "text";
  /**
   * Static text, or fallback when bind is not resolved.
   */
  text?: string;
  bind?: Bind;
  style?: string;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline" | "line-through";
  fontFamily?: string;
  fontSize?: PositiveNumber;
  color?: HexColor;
  link?: {
    href: string;
    tooltip?: string;
  };
};
export type TextRun1 = {
  [k: string]: unknown | undefined;
};
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "measurementOrPercent".
 */
export type MeasurementOrPercent = PositiveNumber | string;
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "pageCellBlock".
 */
export type PageCellBlock = Paragraph | Image | List;
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "floatingContentBlock".
 */
export type FloatingContentBlock = Paragraph | Table | Image | List;
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "nonEmptyString".
 */
export type NonEmptyString = string;
/**
 * @minItems 1
 */
export type Columns = [ColumnDef, ...ColumnDef[]];
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "sheetCell".
 */
export type SheetCell = SheetCell1 & {
  column: number;
  style?: string;
  colspan?: number;
  rowspan?: number;
  bind?: Bind1;
  value?: unknown;
  formula?: string;
  format?: string;
  comment?: string;
};
export type SheetCell1 = {
  [k: string]: unknown | undefined;
};
/**
 * Static rows, used when rowBind is not defined. Can be omitted for an empty table.
 */
export type Rows = SheetRow[];
/**
 * @minItems 1
 */
export type Fields = [FieldDefinition, ...FieldDefinition[]];
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "optionSource".
 */
export type OptionSource =
  | {
      value: unknown;
      label: string;
      disabled?: boolean;
      group?: string;
      [k: string]: unknown | undefined;
    }[]
  | {
      [k: string]: unknown | undefined;
    };
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "layoutNode".
 */
export type LayoutNode =
  | LayoutField
  | LayoutGroup
  | LayoutRow
  | LayoutTabs
  | LayoutSteps
  | LayoutConditional
  | LayoutRepeat
  | LayoutHtml
  | LayoutCustom;
export type Layout = LayoutNode[];

/**
 * Optimized schema with strict conditions, flexible option sources, floating block improvements, and style safety.
 */
export interface BFDocumentSchemaV411 {
  kind: "workbook";
  schemaVersion: "4.1.1";
  id?: string;
  locale?: LocaleString;
  metadata?: {
    [k: string]: unknown | undefined;
  };
  /**
   * Central reactive data tree. All bindings read/write to this object.
   */
  data: {};
  /**
   * Internationalization dictionary. Keys are locale codes (e.g., 'en', 'zh-CN'), values are objects with translation key-value pairs. Labels, titles etc. may reference keys via '@:path' syntax.
   */
  i18n?: {
    [k: string]:
      | {
          [k: string]: string | undefined;
        }
      | undefined;
  };
  assets?: AssetMap;
  styles?: StyleCatalog;
  /**
   * Lifecycle hooks for document-level actions (e.g., onMount, onSubmit, onChange).
   */
  hooks?: Hook[];
  printConfig?: PrintConfig;
  /**
   * @minItems 1
   */
  views: [View, ...View[]];
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "assetMap".
 */
export interface AssetMap {
  [k: string]:
    | {
        src: string;
        type?: string;
      }
    | undefined;
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "styleCatalog".
 */
export interface StyleCatalog {
  paragraphStyles?: {
    [k: string]: ParagraphStyle | undefined;
  };
  characterStyles?: {
    [k: string]: CharacterStyle | undefined;
  };
  tableStyles?: {
    [k: string]: TableStyle | undefined;
  };
  cellStyles?: {
    [k: string]: CellStyle | undefined;
  };
  listStyles?: {
    [k: string]: ListStyle | undefined;
  };
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "paragraphStyle".
 */
export interface ParagraphStyle {
  inherit?: string;
  fontFamily?: string;
  fontSize?: PositiveNumber;
  color?: HexColor;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline" | "line-through";
  lineHeight?: PositiveNumber;
  alignment?: "left" | "center" | "right" | "justify";
  spaceBefore?: NonNegativeNumber;
  spaceAfter?: NonNegativeNumber;
  indent?: number;
  /**
   * Conditional style rules that override properties based on data conditions.
   */
  conditional?: {
    condition: Condition;
    priority?: number;
    /**
     * Override style properties when condition is met. Only listed properties are allowed.
     */
    style?: {
      fontFamily?: string;
      fontSize?: PositiveNumber;
      color?: HexColor;
      fontWeight?: "normal" | "bold";
      fontStyle?: "normal" | "italic";
      textDecoration?: "none" | "underline" | "line-through";
      lineHeight?: PositiveNumber;
      alignment?: "left" | "center" | "right" | "justify";
      spaceBefore?: NonNegativeNumber;
      spaceAfter?: NonNegativeNumber;
      indent?: number;
    };
  }[];
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "characterStyle".
 */
export interface CharacterStyle {
  inherit?: string;
  fontFamily?: string;
  fontSize?: PositiveNumber;
  color?: HexColor;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline" | "line-through";
  conditional?: {
    condition: Condition;
    priority?: number;
    /**
     * Only these character properties can be overridden conditionally.
     */
    style?: {
      fontFamily?: string;
      fontSize?: PositiveNumber;
      color?: HexColor;
      fontWeight?: "normal" | "bold";
      fontStyle?: "normal" | "italic";
      textDecoration?: "none" | "underline" | "line-through";
    };
  }[];
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "tableStyle".
 */
export interface TableStyle {
  inherit?: string;
  fontFamily?: string;
  fontSize?: PositiveNumber;
  color?: HexColor;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline" | "line-through";
  borderWidth?: number;
  borderColor?: HexColor;
  backgroundColor?: HexColor;
  cellPadding?: number;
  hAlign?: "left" | "center" | "right";
  vAlign?: "top" | "middle" | "bottom";
  conditional?: {
    condition: Condition;
    priority?: number;
    style?: {
      fontFamily?: string;
      fontSize?: PositiveNumber;
      color?: HexColor;
      fontWeight?: "normal" | "bold";
      fontStyle?: "normal" | "italic";
      textDecoration?: "none" | "underline" | "line-through";
      borderWidth?: number;
      borderColor?: HexColor;
      backgroundColor?: HexColor;
      cellPadding?: number;
      hAlign?: "left" | "center" | "right";
      vAlign?: "top" | "middle" | "bottom";
    };
  }[];
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "cellStyle".
 */
export interface CellStyle {
  inherit?: string;
  fontFamily?: string;
  fontSize?: PositiveNumber;
  color?: HexColor;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline" | "line-through";
  backgroundColor?: HexColor;
  hAlign?: "left" | "center" | "right";
  vAlign?: "top" | "middle" | "bottom";
  borderTop?: Border;
  borderRight?: Border;
  borderBottom?: Border;
  borderLeft?: Border;
  wrapText?: boolean;
  textRotation?: number;
  format?: string;
  conditional?: {
    condition: Condition;
    priority?: number;
    style?: {
      fontFamily?: string;
      fontSize?: PositiveNumber;
      color?: HexColor;
      fontWeight?: "normal" | "bold";
      fontStyle?: "normal" | "italic";
      textDecoration?: "none" | "underline" | "line-through";
      backgroundColor?: HexColor;
      hAlign?: "left" | "center" | "right";
      vAlign?: "top" | "middle" | "bottom";
      borderTop?: Border;
      borderRight?: Border;
      borderBottom?: Border;
      borderLeft?: Border;
      wrapText?: boolean;
      textRotation?: number;
      format?: string;
    };
  }[];
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "border".
 */
export interface Border {
  style?: "thin" | "medium" | "thick" | "dashed" | "dotted" | "none";
  color?: HexColor;
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "listStyle".
 */
export interface ListStyle {
  inherit?: string;
  listType?: "bullet" | "ordered";
  bulletChar?: string;
  numberFormat?: "decimal" | "lowerLetter" | "upperLetter" | "lowerRoman" | "upperRoman";
  start?: number;
  fontFamily?: string;
  fontSize?: PositiveNumber;
  color?: HexColor;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline" | "line-through";
  alignment?: "left" | "center" | "right" | "justify";
  indent?: number;
  spaceBefore?: NonNegativeNumber;
  spaceAfter?: NonNegativeNumber;
  conditional?: {
    condition: Condition;
    priority?: number;
    style?: {
      listType?: "bullet" | "ordered";
      bulletChar?: string;
      numberFormat?: "decimal" | "lowerLetter" | "upperLetter" | "lowerRoman" | "upperRoman";
      start?: number;
      fontFamily?: string;
      fontSize?: PositiveNumber;
      color?: HexColor;
      fontWeight?: "normal" | "bold";
      fontStyle?: "normal" | "italic";
      textDecoration?: "none" | "underline" | "line-through";
      alignment?: "left" | "center" | "right" | "justify";
      indent?: number;
      spaceBefore?: NonNegativeNumber;
      spaceAfter?: NonNegativeNumber;
    };
  }[];
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "hook".
 */
export interface Hook {
  /**
   * Lifecycle event that fires the hook.
   */
  trigger:
    | "onMount"
    | "onSubmit"
    | "onChange"
    | "onBeforeSave"
    | "onAfterSave"
    | "onValidate"
    | "onBeforePrint"
    | "onAfterPrint"
    | "custom";
  /**
   * Action type. 'api' calls an HTTP endpoint, 'function' invokes a registered function, 'dispatch' triggers an internal event.
   */
  type?: "api" | "function" | "dispatch";
  /**
   * Configuration for the action. Validation is left to the business logic layer.
   */
  config?: {
    [k: string]: unknown | undefined;
  };
  condition?: Condition;
  debounce?: number;
  description?: string;
}
/**
 * Printer/export-specific instructions that do not affect screen rendering.
 *
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "printConfig".
 */
export interface PrintConfig {
  paperSource?: string;
  duplex?: "simplex" | "duplexLong" | "duplexShort";
  copies?: number;
  collate?: boolean;
  orientation?: "portrait" | "landscape";
  /**
   * e.g., 'fitToWidth', 'fitToPage', or a percentage like '80%'
   */
  scale?: string;
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "pageView".
 */
export interface PageView {
  type: "page";
  id?: string;
  label?: string;
  visible?: boolean | Condition;
  pageSettings: PageSettings;
  content: PageContentBlock[];
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "pageSettings".
 */
export interface PageSettings {
  width: PositiveNumber;
  height: PositiveNumber;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  defaultFontFamily?: string;
  defaultFontSize?: number;
  defaultLineHeight?: number;
  defaultColor?: string;
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "paragraph".
 */
export interface Paragraph {
  type: "paragraph";
  style?: string;
  visible?: boolean | Condition;
  alignment?: "left" | "center" | "right" | "justify";
  indent?: number;
  spaceBefore?: NonNegativeNumber;
  spaceAfter?: NonNegativeNumber;
  lineHeight?: PositiveNumber;
  /**
   * @minItems 1
   */
  runs: [Run, ...Run[]];
  comment?: string;
  renderHints?: {
    [k: string]: unknown | undefined;
  };
}
/**
 * Data binding. When both text and bind are present, bind takes precedence and text serves as default.
 */
export interface Bind {
  /**
   * Data path using dot/bracket notation.
   */
  path: string;
  mode?: "twoWay" | "oneWay" | "oneWayToData";
  format?: string;
  placeholder?: unknown;
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "lineBreak".
 */
export interface LineBreak {
  type: "break";
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "inlineImage".
 */
export interface InlineImage {
  type: "inline-image";
  src: string;
  width?: PositiveNumber;
  height?: PositiveNumber;
  lockAspectRatio?: boolean;
  alt?: string;
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "table".
 */
export interface Table {
  type: "table";
  style?: string;
  visible?: boolean | Condition;
  width?: MeasurementOrPercent;
  /**
   * @minItems 1
   */
  columns: [MeasurementOrPercent, ...MeasurementOrPercent[]];
  /**
   * @minItems 1
   */
  rows: [TableRow, ...TableRow[]];
  border?: Border;
  fill?: HexColor;
  comment?: string;
  renderHints?: {
    [k: string]: unknown | undefined;
  };
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "tableRow".
 */
export interface TableRow {
  height?: PositiveNumber;
  /**
   * @minItems 1
   */
  cells: [TableCell, ...TableCell[]];
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "tableCell".
 */
export interface TableCell {
  colSpan?: number;
  rowSpan?: number;
  style?: string;
  verticalAlign?: "top" | "middle" | "bottom";
  width?: MeasurementOrPercent;
  /**
   * @minItems 1
   */
  content: [PageCellBlock, ...PageCellBlock[]];
  comment?: string;
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "image".
 */
export interface Image {
  type: "image";
  src: string;
  width?: PositiveNumber;
  height?: PositiveNumber;
  lockAspectRatio?: boolean;
  alignment?: "left" | "center" | "right";
  alt?: string;
  comment?: string;
  renderHints?: {
    [k: string]: unknown | undefined;
  };
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "list".
 */
export interface List {
  type: "list";
  style?: string;
  visible?: boolean | Condition;
  listType?: "bullet" | "ordered";
  bulletChar?: string;
  numberFormat?: "decimal" | "lowerLetter" | "upperLetter" | "lowerRoman" | "upperRoman";
  start?: number;
  /**
   * @minItems 1
   */
  items: [[PageCellBlock, ...PageCellBlock[]], ...[PageCellBlock, ...PageCellBlock[]][]];
  comment?: string;
  renderHints?: {
    [k: string]: unknown | undefined;
  };
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "pageBreak".
 */
export interface PageBreak {
  type: "page-break";
  comment?: string;
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "floatingBlock".
 */
export interface FloatingBlock {
  type: "floating";
  layout: {
    /**
     * Horizontal position. Number for absolute points, string percentage relative to page width.
     */
    x: number | string;
    /**
     * Vertical position. Number for absolute points, string percentage relative to page height.
     */
    y: number | string;
    width: MeasurementOrPercent;
    height: MeasurementOrPercent;
  };
  content: FloatingContentBlock;
  comment?: string;
  renderHints?: {
    [k: string]: unknown | undefined;
  };
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "spreadsheetBlock".
 */
export interface SpreadsheetBlock {
  type: "spreadsheet";
  sheet: {
    name: NonEmptyString;
    columns: Columns;
    rowBind?: RowBind;
    rows?: Rows;
    frozenRows?: number;
    frozenCols?: number;
  };
  comment?: string;
  renderHints?: {
    [k: string]: unknown | undefined;
  };
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "columnDef".
 */
export interface ColumnDef {
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  hidden?: boolean;
  style?: string;
}
/**
 * Dynamic row source from data array. When set, rows are generated from this binding instead of using static 'rows'. If both rows and rowBind are absent, an empty table is displayed.
 */
export interface RowBind {
  /**
   * Data path using dot/bracket notation.
   */
  path: string;
  mode?: "twoWay" | "oneWay" | "oneWayToData";
  /**
   * Template for each generated row. Uses column indices or field paths.
   */
  rowTemplate?: {
    height?: number;
    hidden?: boolean;
    style?: string;
    /**
     * Map column index (string) to cell definition. Uses mappedSheetCell (column property is excluded as it's the key).
     */
    cellMapping?: {
      [k: string]: MappedSheetCell | undefined;
    };
  };
}
/**
 * Used in cellMapping where column index is the key; column property is omitted.
 *
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "mappedSheetCell".
 */
export interface MappedSheetCell {
  style?: string;
  colspan?: number;
  rowspan?: number;
  bind?: Bind1;
  value?: unknown;
  formula?: string;
  format?: string;
  comment?: string;
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "bind".
 */
export interface Bind1 {
  /**
   * Data path using dot/bracket notation.
   */
  path: string;
  mode?: "twoWay" | "oneWay" | "oneWayToData";
  format?: string;
  placeholder?: unknown;
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "sheetRow".
 */
export interface SheetRow {
  height?: number;
  hidden?: boolean;
  style?: string;
  /**
   * @minItems 1
   */
  cells?: [SheetCell, ...SheetCell[]];
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "headerBlock".
 */
export interface HeaderBlock {
  type: "header";
  /**
   * Paragraph style fallback applied to header content when a paragraph does not define its own style.
   */
  style?: string;
  /**
   * @minItems 1
   */
  content: [Paragraph, ...Paragraph[]];
  alignment?: "left" | "center" | "right";
  showOnFirstPage?: boolean;
  showOnEvenPages?: boolean;
  showOnOddPages?: boolean;
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "footerBlock".
 */
export interface FooterBlock {
  type: "footer";
  /**
   * Paragraph style fallback applied to footer content when a paragraph does not define its own style.
   */
  style?: string;
  /**
   * @minItems 1
   */
  content: [Paragraph, ...Paragraph[]];
  alignment?: "left" | "center" | "right";
  showOnFirstPage?: boolean;
  showOnEvenPages?: boolean;
  showOnOddPages?: boolean;
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "watermarkBlock".
 */
export interface WatermarkBlock {
  type: "watermark";
  text: string;
  fontSize?: PositiveNumber;
  color?: HexColor;
  opacity?: number;
  rotation?: number;
  repeat?: boolean;
  /**
   * Alternative watermark image asset key
   */
  image?: string;
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "sheetView".
 */
export interface SheetView {
  type: "sheet";
  id?: string;
  label?: string;
  visible?: boolean | Condition;
  name: NonEmptyString;
  frozenRows?: number;
  frozenCols?: number;
  defaultColumnWidth?: number;
  defaultRowHeight?: number;
  /**
   * How the sheet adapts to its container width. 'fixed' keeps natural column widths (wide containers leave empty space on the right); 'stretch' distributes the extra container width to stretchable columns (respecting maxWidth) so the sheet fills the container.
   */
  widthMode?: "fixed" | "stretch";
  columns: Columns;
  rowBind?: RowBind;
  rows?: Rows;
  images?: SheetImage[];
  forms?: FormBlock[];
  comment?: string;
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "sheetImage".
 */
export interface SheetImage {
  src: string;
  column: number;
  colOffset?: number;
  row: number;
  rowOffset?: number;
  width?: PositiveNumber;
  height?: PositiveNumber;
  lockAspectRatio?: boolean;
  comment?: string;
}
/**
 * Embedded form used within sheet views. Not available as a standalone page content block.
 *
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "formBlock".
 */
export interface FormBlock {
  type: "form";
  config?: Config;
  fields: Fields;
  layout?: Layout;
  comment?: string;
  renderHints?: {
    [k: string]: unknown | undefined;
  };
}
export interface Config {
  validateMode?: "onChange" | "onBlur" | "onSubmit" | "onTouched";
  /**
   * Render the form in read-only mode: all fields are disabled and submit/reset actions are hidden. Intended for reviewing documents under approval (审核中表单只读).
   */
  readOnly?: boolean;
  submitLabel?: string;
  resetLabel?: string;
  autoSave?: {
    enabled?: boolean;
    debounce?: number;
  };
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "fieldDefinition".
 */
export interface FieldDefinition {
  name: NonEmptyString;
  type:
    | "string"
    | "number"
    | "boolean"
    | "date"
    | "select"
    | "multiselect"
    | "textarea"
    | "array"
    | "object"
    | "custom";
  label?: string;
  bind?: Bind1;
  validations?: Validation[];
  dependencies?: Dependency[];
  defaultValue?: unknown;
  options?: OptionSource;
  visible?: boolean | Condition;
  disabled?: boolean | Condition;
  component?: string;
  props?: {
    [k: string]: unknown | undefined;
  };
  arrayConfig?: ArrayConfig;
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "validation".
 */
export interface Validation {
  type: string;
  params?: unknown;
  message: string;
  async?: boolean;
  condition?: Condition;
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "dependency".
 */
export interface Dependency {
  targetField: NonEmptyString;
  condition: Condition;
  debounce?: number;
  effect: {
    visible?: boolean;
    required?: boolean;
    disabled?: boolean;
    options?: OptionSource;
    validations?: Validation[];
    defaultValue?: unknown;
    props?: {
      [k: string]: unknown | undefined;
    };
  };
  otherwise?: {
    visible?: boolean;
    required?: boolean;
    disabled?: boolean;
    options?: OptionSource;
    validations?: Validation[];
    defaultValue?: unknown;
    props?: {
      [k: string]: unknown | undefined;
    };
  };
}
export interface ArrayConfig {
  minItems?: number;
  maxItems?: number;
  sortable?: boolean;
  addLabel?: string;
  removeLabel?: string;
  itemFields?: FieldDefinition[];
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "layoutField".
 */
export interface LayoutField {
  type: "field";
  name: NonEmptyString;
  span?: number;
  overrides?: FieldDefinition;
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "layoutGroup".
 */
export interface LayoutGroup {
  type: "group";
  title?: string;
  /**
   * @minItems 1
   */
  children: [LayoutNode, ...LayoutNode[]];
  collapsible?: boolean;
  collapsed?: boolean;
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "layoutRow".
 */
export interface LayoutRow {
  type: "row";
  /**
   * @minItems 1
   */
  children: [LayoutNode, ...LayoutNode[]];
  align?: "start" | "center" | "end" | "stretch";
  gutter?: number;
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "layoutTabs".
 */
export interface LayoutTabs {
  type: "tabs";
  /**
   * @minItems 1
   */
  tabs: [
    {
      key: NonEmptyString;
      title: string;
      /**
       * @minItems 1
       */
      children: [LayoutNode, ...LayoutNode[]];
      lazy?: boolean;
      keepAlive?: boolean;
      visible?: Condition;
      badge?: unknown;
    },
    ...{
      key: NonEmptyString;
      title: string;
      /**
       * @minItems 1
       */
      children: [LayoutNode, ...LayoutNode[]];
      lazy?: boolean;
      keepAlive?: boolean;
      visible?: Condition;
      badge?: unknown;
    }[]
  ];
  defaultActiveKey?: string;
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "layoutSteps".
 */
export interface LayoutSteps {
  type: "steps";
  /**
   * @minItems 1
   */
  steps: [
    {
      key: NonEmptyString;
      title: string;
      /**
       * @minItems 1
       */
      children: [LayoutNode, ...LayoutNode[]];
      enableCondition?: Condition;
      validateOnNext?: boolean;
    },
    ...{
      key: NonEmptyString;
      title: string;
      /**
       * @minItems 1
       */
      children: [LayoutNode, ...LayoutNode[]];
      enableCondition?: Condition;
      validateOnNext?: boolean;
    }[]
  ];
  current?: number;
  direction?: "horizontal" | "vertical";
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "layoutConditional".
 */
export interface LayoutConditional {
  type: "conditional";
  condition: Condition;
  /**
   * @minItems 1
   */
  children: [LayoutNode, ...LayoutNode[]];
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "layoutRepeat".
 */
export interface LayoutRepeat {
  type: "repeat";
  field: NonEmptyString;
  /**
   * @minItems 1
   */
  children: [LayoutNode, ...LayoutNode[]];
  arrayConfig?: ArrayConfig;
  addPosition?: "top" | "bottom" | "both";
  emptyText?: string;
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "layoutHtml".
 */
export interface LayoutHtml {
  type: "html";
  content: string;
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "layoutCustom".
 */
export interface LayoutCustom {
  type: "custom";
  component: NonEmptyString;
  props?: {
    [k: string]: unknown | undefined;
  };
  children?: LayoutNode[];
}
/**
 * This interface was referenced by `BFDocumentSchemaV411`'s JSON-Schema
 * via the `definition` "formView".
 */
export interface FormView {
  type: "form";
  id?: string;
  label?: string;
  visible?: boolean | Condition;
  config?: Config;
  fields: Fields;
  layout?: Layout;
  comment?: string;
  renderHints?: {
    [k: string]: unknown | undefined;
  };
}

export type WorkbookDefinition = BFDocumentSchemaV411;
