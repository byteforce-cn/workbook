import { formatBoundValue, resolveBindValue } from "../../core/bind/resolveBind";
import type { SheetCellDefinition, WorkbookData, WorkbookRowContext } from "../../core/types";

export interface SheetFormulaContext {
  getCellValue(address: string): unknown;
  getRangeValues(startAddress: string, endAddress: string): unknown[];
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  return 0;
}

function aggregateValues(functionName: string, values: unknown[]) {
  const numericValues = values.map(toNumber);

  switch (functionName.toUpperCase()) {
    case "AVG":
      return numericValues.length === 0
        ? 0
        : numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
    case "MIN":
      return numericValues.length === 0 ? 0 : Math.min(...numericValues);
    case "MAX":
      return numericValues.length === 0 ? 0 : Math.max(...numericValues);
    case "COUNT":
      return numericValues.filter((value) => Number.isFinite(value)).length;
    default:
      return numericValues.reduce((sum, value) => sum + value, 0);
  }
}

function substituteFormulaReferences(expression: string, formulaContext?: SheetFormulaContext) {
  if (formulaContext == null) {
    return expression;
  }

  const withFunctions = expression.replace(
    /\b(SUM|AVG|MIN|MAX|COUNT)\(([A-Z]+\d+):([A-Z]+\d+)\)/gi,
    (_match, functionName: string, startAddress: string, endAddress: string) => {
      return String(
        aggregateValues(
          functionName,
          formulaContext.getRangeValues(startAddress.toUpperCase(), endAddress.toUpperCase()),
        ),
      );
    },
  );

  return withFunctions.replace(/\b([A-Z]+\d+)\b/gi, (_match, address: string) =>
    String(toNumber(formulaContext.getCellValue(address.toUpperCase()))),
  );
}

/**
 * Safe formula evaluator for sheet cells.
 *
 * Security: The regex whitelist only permits digits, basic arithmetic operators,
 * parentheses, decimal points, and whitespace. No alphabetic characters are allowed,
 * which prevents function calls, variable access, or any code injection via `new Function`.
 * A length limit prevents DoS via extremely long expressions.
 *
 * Supported: A1-style cell references (substituted before eval), +, -, *, /, (, ), decimals.
 */
function safeEvalFormula(formula: string, formulaContext?: SheetFormulaContext): string {
  const rawExpression = substituteFormulaReferences(formula.slice(1), formulaContext);

  // Length limit prevents resource exhaustion
  if (rawExpression.length > 500) {
    return formula;
  }

  // Only allow pure arithmetic: digits, operators, parens, dots, whitespace
  if (!/^[0-9+\-*/().\s]+$/.test(rawExpression)) {
    return formula;
  }

  // Ensure expression doesn't start with an operator (malformed)
  if (/^[+\-*/]/.test(rawExpression)) {
    return formula;
  }

  try {
    const result = new Function(`return (${rawExpression})`)() as number;
    return String(result);
  } catch {
    return formula;
  }
}

export function resolveSheetCellDisplayValue(
  cell: SheetCellDefinition,
  data: WorkbookData,
  rowContext?: WorkbookRowContext,
  styleFormat?: string,
  formulaContext?: SheetFormulaContext,
): string {
  const displayFormat = cell.format ?? styleFormat;

  if (cell.formula != null) {
    return String(formatBoundValue(safeEvalFormula(cell.formula, formulaContext), displayFormat) ?? "");
  }

  if (cell.bind != null) {
    return String(formatBoundValue(resolveBindValue(cell.bind as never, data, rowContext), displayFormat) ?? "");
  }

  return String(formatBoundValue(cell.value, displayFormat) ?? "");
}
