import type { FormatOption } from "../format/textFormat";

export interface StylePickerProps {
  kind: "paragraph" | "character";
  label: string;
  value: string;
  options: FormatOption[];
  onChange(styleId: string): void;
}

/** Named-style picker. Choosing a style writes its id; it never expands marks. */
export function StylePicker({ kind, label, value, options, onChange }: StylePickerProps) {
  return (
    <label className="bf-editor-toolbar-field">
      {label}
      <select
        aria-label={label}
        data-style-kind={kind}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">—</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
