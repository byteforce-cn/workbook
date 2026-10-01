import type { ReactNode } from "react";

export interface FieldApiLike {
  state: {
    value: unknown;
  };
  handleChange(nextValue: unknown): void;
  handleBlur(): void;
}

export interface FormApiLike {
  Field(props: { name: string; children: (fieldApi: FieldApiLike) => ReactNode }): ReactNode;
  setFieldValue(field: string, value: unknown): void;
  handleSubmit(): Promise<void>;
  reset(): void;
}
