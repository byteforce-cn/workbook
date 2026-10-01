import type { WorkbookData, WorkbookRowContext, WorkbookStyleCatalog } from "../core/types";
import type { WorkbookPluginRegistry } from "../react/registry";
import { applyConditionalStyle, type ConditionalStyleRule } from "./applyConditionalStyle";

type StyleDictionary = Record<string, Record<string, unknown> | undefined>;
type ConditionalStyle = Record<string, unknown> & { inherit?: string; conditional?: ConditionalStyleRule[] };

function resolveStyleDefinition(
  styles: StyleDictionary | undefined,
  styleName: string | undefined,
  data: WorkbookData,
  registry: WorkbookPluginRegistry,
  rowContext?: WorkbookRowContext,
  seen = new Set<string>(),
): Record<string, unknown> {
  if (styleName == null || styles == null) {
    return {};
  }

  if (seen.has(styleName)) {
    return {};
  }

  const style = styles[styleName] as ConditionalStyle | undefined;
  if (style == null) {
    return {};
  }

  seen.add(styleName);
  const inheritedStyle = resolveStyleDefinition(styles, style.inherit, data, registry, rowContext, seen);
  const { conditional, inherit: _inherit, ...baseStyle } = style;

  return applyConditionalStyle(
    {
      ...inheritedStyle,
      ...baseStyle,
    },
    conditional,
    data,
    registry,
    rowContext,
  );
}

export function createStyleCatalogResolver(
  catalog: WorkbookStyleCatalog | undefined,
  registry: WorkbookPluginRegistry,
) {
  return {
    resolveParagraphStyle(styleName: string | undefined, data: WorkbookData, rowContext?: WorkbookRowContext) {
      return resolveStyleDefinition(
        catalog?.paragraphStyles as StyleDictionary | undefined,
        styleName,
        data,
        registry,
        rowContext,
      );
    },
    resolveCharacterStyle(styleName: string | undefined, data: WorkbookData, rowContext?: WorkbookRowContext) {
      return resolveStyleDefinition(
        catalog?.characterStyles as StyleDictionary | undefined,
        styleName,
        data,
        registry,
        rowContext,
      );
    },
    resolveTableStyle(styleName: string | undefined, data: WorkbookData, rowContext?: WorkbookRowContext) {
      return resolveStyleDefinition(
        catalog?.tableStyles as StyleDictionary | undefined,
        styleName,
        data,
        registry,
        rowContext,
      );
    },
    resolveCellStyle(styleName: string | undefined, data: WorkbookData, rowContext?: WorkbookRowContext) {
      return resolveStyleDefinition(
        catalog?.cellStyles as StyleDictionary | undefined,
        styleName,
        data,
        registry,
        rowContext,
      );
    },
    resolveListStyle(styleName: string | undefined, data: WorkbookData, rowContext?: WorkbookRowContext) {
      return resolveStyleDefinition(
        catalog?.listStyles as StyleDictionary | undefined,
        styleName,
        data,
        registry,
        rowContext,
      );
    },
  };
}
