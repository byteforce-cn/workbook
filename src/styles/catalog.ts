import type { ConditionContext } from "../core/condition/evaluate";
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
  context?: ConditionContext,
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
  const inheritedStyle = resolveStyleDefinition(styles, style.inherit, data, registry, rowContext, context, seen);
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
    context,
  );
}

export function createStyleCatalogResolver(
  catalog: WorkbookStyleCatalog | undefined,
  registry: WorkbookPluginRegistry,
  context?: ConditionContext,
) {
  const resolve = (
    styles: StyleDictionary | undefined,
    styleName: string | undefined,
    data: WorkbookData,
    rowContext?: WorkbookRowContext,
  ) => resolveStyleDefinition(styles, styleName, data, registry, rowContext, context);

  return {
    resolveParagraphStyle(styleName: string | undefined, data: WorkbookData, rowContext?: WorkbookRowContext) {
      return resolve(catalog?.paragraphStyles as StyleDictionary | undefined, styleName, data, rowContext);
    },
    resolveCharacterStyle(styleName: string | undefined, data: WorkbookData, rowContext?: WorkbookRowContext) {
      return resolve(catalog?.characterStyles as StyleDictionary | undefined, styleName, data, rowContext);
    },
    resolveTableStyle(styleName: string | undefined, data: WorkbookData, rowContext?: WorkbookRowContext) {
      return resolve(catalog?.tableStyles as StyleDictionary | undefined, styleName, data, rowContext);
    },
    resolveCellStyle(styleName: string | undefined, data: WorkbookData, rowContext?: WorkbookRowContext) {
      return resolve(catalog?.cellStyles as StyleDictionary | undefined, styleName, data, rowContext);
    },
    resolveListStyle(styleName: string | undefined, data: WorkbookData, rowContext?: WorkbookRowContext) {
      return resolve(catalog?.listStyles as StyleDictionary | undefined, styleName, data, rowContext);
    },
  };
}
