# Integrity: canonical JSON, hashing, signatures, migrations

Workbook documents are persisted, compared, and optionally signed. These rules
are a protocol: changing key ordering or the default hashed field set invalidates
every previously published hash and signature.

Canonical rules version: **1**.

## Canonical serialization

`canonicalize(value)`:

1. object keys are sorted lexicographically;
2. numbers use ECMAScript `Number#toString` semantics, `-0` becomes `0`, and
   `NaN`/`Infinity` throw;
3. strings use `JSON.stringify` semantics;
4. array order is preserved;
5. object members whose value is `undefined` are dropped; `null` is kept;
6. no whitespace.

`canonicalBytes` returns the UTF-8 bytes.

## Content hash

```ts
import { contentHash } from "@byteforce/workbook/core";

const hash = await contentHash(workbook);
```

- SHA-256 over the canonical UTF-8 bytes.
- Default fields: `kind`, `schemaVersion`, `views`, `styles`, `printConfig`,
  `assets`.
- `data` is excluded by default because filled-in values change while the
  contract template does not. Include it explicitly:

```ts
await contentHash(workbook, { include: ["views", "styles", "data"] });
```

Hashing requires WebCrypto (`crypto.subtle`), i.e. HTTPS/localhost in browsers.
Node 20+ exposes it globally. The library throws instead of falling back to a
non-cryptographic hash.

## Signature hooks

The library orchestrates; the host owns keys and algorithms.

```ts
import { signDocument, verifyDocument, contentHash } from "@byteforce/workbook/core";

const signature = await signDocument(workbook, {
  async sign(payload) {
    // Host code: Ed25519 via WebCrypto, KMS, HSM, etc.
    const value = await crypto.subtle.sign({ name: "Ed25519" }, privateKey, payload);
    return {
      alg: "Ed25519",
      kid: "2026-01",
      value: Buffer.from(value).toString("base64url"),
      signedAt: new Date().toISOString(),
      contentHash: await contentHash(workbook),
    };
  },
});

const ok = await verifyDocument(workbook, signature, {
  async verify(payload, stored) {
    return crypto.subtle.verify(
      { name: "Ed25519" },
      publicKey,
      Buffer.from(stored.value, "base64url"),
      payload,
    );
  },
});
```

`signDocument` recomputes the payload hash and rejects a signer that reports a
different `contentHash`. `verifyDocument` returns `false` for a content
mismatch or a cryptographic failure. Key management is intentionally out of
scope.

Security note: a hash proves integrity only when the expected hash is delivered
through a trusted channel. Signatures prove authorship only if the verifier's
public key is trusted.

## Schema migrations

```ts
import { registerMigration, migrateWorkbook } from "@byteforce/workbook/core";

registerMigration("4.0.0", "4.1.0", (doc) => ({ ...doc, schemaVersion: "4.1.0" }));
registerMigration("4.1.0", "4.1.1", (doc) => ({ ...doc, schemaVersion: "4.1.1" }));

const { workbook: current, applied } = migrateWorkbook(legacy);
```

- Chains are resolved deterministically between the document version and the
  target (default `CURRENT_SCHEMA_VERSION`).
- Unknown versions or missing edges **fail closed**; the error names the
  supported version range. No guessing.
- The migrated document runs through `validateWorkbookDocument`; a step that
  produces an invalid document throws.
