/**
 * Framework-agnostic dependency resolution engine.
 * Resolves field state based on condition-dependent effect/otherwise rules.
 */

import type {
  DependencyDefinition,
  FieldDefinition,
  ResolvedFieldState,
  WorkbookData,
  WorkbookRowContext,
} from "../../core/types";
import { type ConditionContext, evaluateCondition } from "../condition/evaluate";
import type { CorePluginSlots } from "../registry/registry";

function mergeDependencyEffect(
  state: ResolvedFieldState,
  dependency: DependencyDefinition,
  matched: boolean,
): ResolvedFieldState {
  const effect = matched ? dependency.effect : dependency.otherwise;
  if (effect == null) return state;

  return {
    visible: effect.visible ?? state.visible,
    required: effect.required ?? state.required,
    disabled: effect.disabled ?? state.disabled,
    options: effect.options ?? state.options,
    validations: effect.validations ?? state.validations,
    props: {
      ...state.props,
      ...(effect.props ?? {}),
    },
    defaultValue: effect.defaultValue ?? state.defaultValue,
  };
}

/** Resolves a field's static `disabled` flag (boolean or condition). */
function resolveStaticDisabled(
  field: FieldDefinition,
  data: WorkbookData,
  registry: CorePluginSlots,
  rowContext?: WorkbookRowContext,
  conditionContext?: ConditionContext,
): boolean {
  const staticDisabled = field.disabled;
  if (typeof staticDisabled === "boolean") {
    return staticDisabled;
  }
  if (staticDisabled == null) {
    return false;
  }
  return evaluateCondition(staticDisabled, data, registry, rowContext, conditionContext);
}

export function resolveFieldState(
  field: FieldDefinition,
  data: WorkbookData,
  registry: CorePluginSlots,
  rowContext?: WorkbookRowContext,
  conditionContext?: ConditionContext,
): ResolvedFieldState {
  const baseState: ResolvedFieldState = {
    visible: true,
    required: false,
    disabled: resolveStaticDisabled(field, data, registry, rowContext, conditionContext),
    options: field.options,
    validations: [...(field.validations ?? [])],
    props: { ...(field.props ?? {}) },
    defaultValue: field.defaultValue,
  };

  return (field.dependencies ?? []).reduce((currentState, dependency) => {
    const matched = evaluateCondition(dependency.condition, data, registry, rowContext, conditionContext);
    return mergeDependencyEffect(currentState, dependency, matched);
  }, baseState);
}
