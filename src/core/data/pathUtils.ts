/**
 * Framework-agnostic path utilities for traversing and manipulating nested data objects.
 * Zero React dependency — usable in Node.js, browser, or any JS runtime.
 */

import type { WorkbookData, WorkbookRowContext } from "../../core/types";

export type PathToken = string | number | "*";

const PATH_TOKEN_PATTERN = /([^.[\]]+)|(\[(\d+|\*)\])/g;

export function parsePath(path: string): PathToken[] {
  const tokens: PathToken[] = [];

  path.replace(PATH_TOKEN_PATTERN, (_match, word, _bracket, bracketValue) => {
    if (word) {
      tokens.push(word);
      return _match;
    }

    if (bracketValue === "*") {
      tokens.push("*");
      return _match;
    }

    tokens.push(Number(bracketValue));
    return _match;
  });

  return tokens;
}

export function hasRowWildcard(path: string): boolean {
  return parsePath(path).includes("*");
}

export function materializePath(path: string, rowContext?: WorkbookRowContext): string {
  return parsePath(path)
    .map((token, index) => {
      if (token === "*") {
        if (rowContext == null) {
          throw new Error(`Path "${path}" requires row context but none was provided.`);
        }

        return `[${rowContext.index}]`;
      }

      if (typeof token === "number") {
        return `[${token}]`;
      }

      return index === 0 ? token : `.${token}`;
    })
    .join("");
}

function resolveTokens(path: string, rowContext?: WorkbookRowContext): Array<string | number> {
  return parsePath(path).map((token) => {
    if (token !== "*") {
      return token;
    }

    if (rowContext == null) {
      throw new Error(`Path "${path}" requires row context but none was provided.`);
    }

    return rowContext.index;
  });
}

export function getValueAtPath(data: unknown, path: string, rowContext?: WorkbookRowContext): unknown {
  const tokens = resolveTokens(path, rowContext);
  let current = data;

  for (const token of tokens) {
    if (current == null) {
      return undefined;
    }

    if (typeof token === "number") {
      current = Array.isArray(current) ? current[token] : undefined;
      continue;
    }

    current = typeof current === "object" ? (current as Record<string, unknown>)[token] : undefined;
  }

  return current;
}

export function setValueAtPath(
  target: WorkbookData,
  path: string,
  value: unknown,
  rowContext?: WorkbookRowContext,
): void {
  const tokens = resolveTokens(path, rowContext);

  if (tokens.length === 0) {
    return;
  }

  let current: Record<string, unknown> | unknown[] = target;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const isLast = index === tokens.length - 1;

    if (isLast) {
      if (typeof token === "number") {
        (current as unknown[])[token] = value;
      } else {
        (current as Record<string, unknown>)[token] = value;
      }
      return;
    }

    const nextToken = tokens[index + 1];
    const nextIsArray = typeof nextToken === "number";
    const existingValue =
      typeof token === "number" ? (current as unknown[])[token] : (current as Record<string, unknown>)[token];

    if (existingValue == null || typeof existingValue !== "object") {
      const nextContainer: Record<string, unknown> | unknown[] = nextIsArray ? [] : {};
      if (typeof token === "number") {
        (current as unknown[])[token] = nextContainer;
      } else {
        (current as Record<string, unknown>)[token] = nextContainer;
      }
      current = nextContainer;
      continue;
    }

    current = existingValue as Record<string, unknown> | unknown[];
  }
}

export function deleteValueAtPath(target: WorkbookData, path: string, rowContext?: WorkbookRowContext): void {
  const tokens = resolveTokens(path, rowContext);

  if (tokens.length === 0) {
    return;
  }

  const parentTokens = tokens.slice(0, -1);
  const lastToken = tokens[tokens.length - 1];
  const parentValue =
    parentTokens.length === 0 ? target : getValueAtPath(target, materializePathFromTokens(parentTokens));

  if (parentValue == null || typeof parentValue !== "object") {
    return;
  }

  if (typeof lastToken === "number") {
    if (Array.isArray(parentValue)) {
      parentValue.splice(lastToken, 1);
    }
    return;
  }

  delete (parentValue as Record<string, unknown>)[lastToken];
}

export function materializePathFromTokens(tokens: Array<string | number>): string {
  return tokens
    .map((token, index) => {
      if (typeof token === "number") {
        return `[${token}]`;
      }

      return index === 0 ? token : `.${token}`;
    })
    .join("");
}
