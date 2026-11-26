/**
 * Content hashing for workbook documents.
 *
 * Hash input is the canonical serialization of a selected subset of the
 * document. `data` is intentionally excluded by default: contract templates
 * stay stable while their filled-in values change.
 */

import type { WorkbookDefinition } from "../../schema/generated-types";
import { canonicalBytes } from "./canonical";

/** Top-level document fields covered by the default content hash. */
export const DEFAULT_CONTENT_KEYS = ["kind", "schemaVersion", "views", "styles", "printConfig", "assets"] as const;

export type ContentKey = (typeof DEFAULT_CONTENT_KEYS)[number] | "data" | "locale" | "i18n" | "hooks";

export interface ContentHashOptions {
  /**
   * Top-level document fields to include. Defaults to
   * `["kind", "schemaVersion", "views", "styles", "printConfig", "assets"]`.
   */
  include?: readonly ContentKey[];
}

function pickContent(workbook: WorkbookDefinition, include: readonly ContentKey[]): Record<string, unknown> {
  const source = workbook as unknown as Record<string, unknown>;
  const selected: Record<string, unknown> = {};

  for (const key of include) {
    if ((key as string) === "data") {
      selected.data = source.data;
    } else if (source[key] !== undefined) {
      selected[key] = source[key];
    }
  }

  return selected;
}

/** Canonical bytes that a signature covers. */
export function contentPayload(workbook: WorkbookDefinition, options: ContentHashOptions = {}): Uint8Array {
  const include = options.include ?? DEFAULT_CONTENT_KEYS;
  return canonicalBytes(pickContent(workbook, include));
}

/** SHA-256 of raw bytes, hex-encoded (lowercase). */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle == null) {
    throw new Error(
      "[workbook] crypto.subtle is unavailable. Content hashing requires a secure context " +
        "(HTTPS or localhost) or a runtime with WebCrypto. Do not silently degrade to a non-cryptographic hash.",
    );
  }

  const digest = await subtle.digest("SHA-256", new Uint8Array(bytes));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** `contentHash(workbook) → hex` over the canonical document content. */
export async function contentHash(workbook: WorkbookDefinition, options: ContentHashOptions = {}): Promise<string> {
  return sha256Hex(contentPayload(workbook, options));
}
