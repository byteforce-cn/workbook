import { type ConditionContext, evaluateCondition } from "../core/condition/evaluate";
import type { WorkbookConditionDefinition, WorkbookData, WorkbookRowContext } from "../core/types";
import type { WorkbookPluginRegistry } from "../react/registry";

export interface ConditionalStyleRule {
  condition: WorkbookConditionDefinition;
  priority?: number;
  style: Record<string, unknown>;
}

export function applyConditionalStyle(
  baseStyle: Record<string, unknown>,
  rules: ConditionalStyleRule[] | undefined,
  data: WorkbookData,
  registry: WorkbookPluginRegistry,
  rowContext?: WorkbookRowContext,
  context?: ConditionContext,
): Record<string, unknown> {
  return [...(rules ?? [])]
    .sort((left, right) => (left.priority ?? 0) - (right.priority ?? 0))
    .reduce((currentStyle, rule) => {
      if (!evaluateCondition(rule.condition, data, registry, rowContext, context)) {
        return currentStyle;
      }

      return {
        ...currentStyle,
        ...rule.style,
      };
    }, baseStyle);
}
