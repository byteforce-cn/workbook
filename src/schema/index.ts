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

/** True when a runtime error came from CSP blocking runtime code generation. */
function isEvalBlockedError(error: unknown): boolean {
  if (error instanceof EvalError) {
    return true;
  }

  const message = error instanceof Error ? error.message : "";
  return /unsafe-eval|refused to evaluate|eval\(\) is disabled/i.test(message);
}

export function getWorkbookValidator(): ValidateFunction<WorkbookDefinition> {
  if (validator == null) {
    try {
      validator = ajv.compile<WorkbookDefinition>(schemaJson);
    } catch (error) {
      if (isEvalBlockedError(error)) {
        // AJV generates its validator with `new Function`, which a strict
        // `script-src 'self'` CSP blocks. Name the cause and the escape hatch
        // instead of surfacing a bare EvalError from inside AJV.
        throw new Error(
          "[workbook] Cannot compile the document schema validator: this Content Security Policy blocks " +
            "runtime code generation. Allow 'unsafe-eval' in script-src, or precompile a validator " +
            "(e.g. with ajv/dist/standalone) and pass it as the `validate` prop of <DocumentRenderer> — " +
            "see docs-site/guides/content-security-policy.md.",
          { cause: error },
        );
      }

      throw error;
    }
  }

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
