/**
 * Signature hooks for workbook documents.
 *
 * The library only orchestrates: canonical bytes in, signature out. Key
 * management, algorithms, and trust policy stay with the host.
 */

import type { WorkbookDefinition } from "../../schema/generated-types";
import { type ContentHashOptions, contentHash, contentPayload } from "./hash";

export interface DocumentSignature {
  /** Host-declared algorithm, e.g. `"Ed25519"`. */
  alg: string;
  /** Optional key id for rotation. */
  kid?: string;
  /** base64url signature bytes. */
  value: string;
  /** ISO 8601 timestamp. */
  signedAt: string;
  /** Hex content hash the signature covers. */
  contentHash: string;
}

export interface DocumentSigner {
  sign(payload: Uint8Array): Promise<DocumentSignature>;
}

export interface DocumentVerifier {
  verify(payload: Uint8Array, signature: DocumentSignature): Promise<boolean>;
}

/**
 * Sign the canonical content payload.
 *
 * The returned signature's `contentHash` is recomputed locally and must match
 * what the signer reported; a mismatch means the signer covered different
 * bytes and is rejected instead of stored.
 */
export async function signDocument(
  workbook: WorkbookDefinition,
  signer: DocumentSigner,
  options: ContentHashOptions = {},
): Promise<DocumentSignature> {
  const payload = contentPayload(workbook, options);
  const expectedHash = await contentHash(workbook, options);
  const signature = await signer.sign(payload);

  if (signature.contentHash !== expectedHash) {
    throw new Error(
      `[workbook] Signer reported contentHash ${signature.contentHash} but the canonical payload hashes to ${expectedHash}.`,
    );
  }

  return signature;
}

/**
 * Verify a stored signature against the current document.
 *
 * Returns `false` for both a content mismatch and a cryptographic failure —
 * callers that need to distinguish them should hash first.
 */
export async function verifyDocument(
  workbook: WorkbookDefinition,
  signature: DocumentSignature,
  verifier: DocumentVerifier,
  options: ContentHashOptions = {},
): Promise<boolean> {
  const expectedHash = await contentHash(workbook, options);
  if (signature.contentHash !== expectedHash) {
    return false;
  }

  return verifier.verify(contentPayload(workbook, options), signature);
}
