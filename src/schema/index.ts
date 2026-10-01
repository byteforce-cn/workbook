import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

import schemaJson from "./bf-schema-v4.1.1.json";

export { default as workbookSchemaJson } from "./bf-schema-v4.1.1.json";
export * from "./generated-types";

import type { WorkbookDefinition } from "./generated-types";

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

let validator: ValidateFunction<WorkbookDefinition> | undefined;

export interface WorkbookValidationResult {
  valid: boolean;
  errors: ErrorObject<string, Record<string, unknown>, unknown>[];
}

export function getWorkbookValidator(): ValidateFunction<WorkbookDefinition> {
  validator ??= ajv.compile<WorkbookDefinition>(schemaJson);
  return validator;
}

export function validateWorkbookDocument(value: unknown): WorkbookValidationResult {
  const compiled = getWorkbookValidator();
  const valid = compiled(value);

  return {
    valid,
    errors: valid ? [] : (compiled.errors ?? []),
  };
}
