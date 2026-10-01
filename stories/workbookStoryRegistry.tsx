import type { WorkbookFieldPluginProps } from "../src/core/types";
import { createPluginRegistry } from "../src/react/registry";

function readOptionList(field: WorkbookFieldPluginProps["field"]) {
  const options = field.props?.options;
  if (!Array.isArray(options)) {
    return [
      { label: "草稿", value: "draft" },
      { label: "复核中", value: "reviewing" },
      { label: "已批准", value: "approved" },
    ];
  }

  return options.filter((option): option is { label: string; value: string } => {
    return (
      option != null &&
      typeof option === "object" &&
      typeof (option as { label?: unknown }).label === "string" &&
      typeof (option as { value?: unknown }).value === "string"
    );
  });
}

export function ShadcnStatusField({ field, value, errors, disabled, onChange, onBlur }: WorkbookFieldPluginProps) {
  const options = readOptionList(field);

  return (
    <div className="bf-shadcn-status-field">
      <span>{field.label ?? field.name}</span>
      <div className="bf-shadcn-status-field__control" role="group" aria-label={field.label ?? field.name}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            data-state={String(value ?? "") === option.value ? "active" : "inactive"}
            disabled={disabled}
            onClick={() => {
              onChange(option.value);
              onBlur();
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
      {errors.length > 0 ? <small>{errors.join(" ")}</small> : null}
    </div>
  );
}

export function createProductionStoryRegistry() {
  const registry = createPluginRegistry();
  registry.field.set("shadcn/status-segmented", ShadcnStatusField);
  return registry;
}
