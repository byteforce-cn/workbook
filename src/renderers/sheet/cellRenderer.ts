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
 * which prevents function calls, variable access, or any code injection — and the
 * expression is parsed directly instead of compiled with `new Function`, so
 * formulas keep working under a strict `script-src 'self'` CSP.
 * A length limit prevents DoS via extremely long expressions.
 *
 * Supported: A1-style cell references (substituted before evaluation), +, -, *, /, **, (, ), decimals.
 */
/**
 * Evaluate a whitelisted arithmetic expression without `new Function`.
 *
 * Strict CSP deployments (`script-src 'self'`, without 'unsafe-eval') forbid
 * runtime code generation, which made every formula silently fall back to its
 * raw source text. Only digits, `+ - * / **`, parentheses and decimal points can
 * reach this function — the caller's whitelist rejects everything else — so a
 * small recursive-descent parser is enough, and it keeps JS semantics for
 * precedence, unary signs, `**` (right-associative), `Infinity` and `NaN`.
 */
function evaluateArithmetic(expression: string): number {
  let index = 0;

  const isDigit = (char: string) => char >= "0" && char <= "9";

  const skipWhitespace = () => {
    while (index < expression.length && /\s/.test(expression[index])) {
      index++;
    }
  };

  const parseNumber = (): number => {
    skipWhitespace();
    const start = index;
    while (index < expression.length && (isDigit(expression[index]) || expression[index] === ".")) {
      index++;
    }

    const text = expression.slice(start, index);
    const value = Number(text);
    if (text === "" || Number.isNaN(value)) {
      throw new Error(`Invalid number: "${text}"`);
    }

    return value;
  };

  const parsePrimary = (): number => {
    skipWhitespace();
    if (expression[index] === "(") {
      index++;
      const value = parseExpression();
      skipWhitespace();
      if (expression[index] !== ")") {
        throw new Error("Unbalanced parentheses");
      }
      index++;
      return value;
    }

    return parseNumber();
  };

  const parseUnary = (): number => {
    skipWhitespace();
    if (expression[index] === "-") {
      index++;
      return -parseUnary();
    }
    if (expression[index] === "+") {
      index++;
      return parseUnary();
    }

    return parsePrimary();
  };

  const parsePower = (): number => {
    const base = parseUnary();
    skipWhitespace();
    if (expression.slice(index, index + 2) === "**") {
      index += 2;
      return base ** parsePower();
    }

    return base;
  };

  const parseTerm = (): number => {
    let value = parsePower();
    for (;;) {
      skipWhitespace();
      const char = expression[index];
      if (char === "*" && expression.slice(index, index + 2) !== "**") {
        index++;
        value *= parsePower();
        continue;
      }
      if (char === "/") {
        index++;
        value /= parsePower();
        continue;
      }
      return value;
    }
  };

  const parseExpression = (): number => {
    let value = parseTerm();
    for (;;) {
      skipWhitespace();
      const char = expression[index];
      if (char === "+") {
        index++;
        value += parseTerm();
        continue;
      }
      if (char === "-") {
        index++;
        value -= parseTerm();
        continue;
      }
      return value;
    }
  };

  const value = parseExpression();
  skipWhitespace();
  if (index !== expression.length) {
    throw new Error(`Unexpected token at position ${index}`);
  }

  return value;
}

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
    return String(evaluateArithmetic(rawExpression));
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
