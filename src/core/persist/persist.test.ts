import { afterEach, describe, expect, it } from "vitest";
import type { WorkbookDefinition } from "../../schema/generated-types";
import { canonicalize } from "./canonical";
import { contentHash } from "./hash";
import { clearMigrations, migrateWorkbook, registerMigration, supportedSchemaVersions } from "./migrate";
import { type DocumentSignature, signDocument, verifyDocument } from "./signature";

function workbook(): WorkbookDefinition {
  return {
    kind: "workbook",
    schemaVersion: "4.1.1",
    data: { customer: { name: "Alice" } },
    views: [
      {
        type: "page",
        pageSettings: { width: 595, height: 842 },
        content: [
          {
            type: "paragraph",
            runs: [{ type: "text", text: "Contract" }],
          },
        ],
      },
    ],
  } as unknown as WorkbookDefinition;
}

function base64url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

afterEach(() => clearMigrations());

describe("canonical JSON", () => {
  it("sorts keys and drops undefined object members", () => {
    expect(canonicalize({ b: 1, a: { d: undefined, c: [2, 1] } })).toBe('{"a":{"c":[2,1]},"b":1}');
  });

  it("normalizes -0 and keeps Number#toString semantics", () => {
    expect(canonicalize({ zero: -0, big: 1e21 })).toBe('{"big":1e+21,"zero":0}');
  });

  it("rejects non-finite numbers and undefined array items", () => {
    expect(() => canonicalize({ value: Number.NaN })).toThrow(/NaN or Infinity/);
    expect(() => canonicalize({ value: Number.POSITIVE_INFINITY })).toThrow(/NaN or Infinity/);
    expect(() => canonicalize([undefined])).toThrow(/undefined/);
  });

  it("rejects circular references", () => {
    const value: Record<string, unknown> = {};
    value.self = value;
    expect(() => canonicalize(value)).toThrow(/circular/);
  });
});

describe("content hash", () => {
  it("is stable across key order", async () => {
    const left = workbook();
    const right = JSON.parse(JSON.stringify(left)) as unknown as WorkbookDefinition;
    expect(await contentHash(left)).toBe(await contentHash(right));
  });

  it("excludes data by default and includes it on request", async () => {
    const baseline = workbook();
    const changed = workbook();
    changed.data = { customer: { name: "Bob" } };

    expect(await contentHash(changed)).toBe(await contentHash(baseline));
    expect(await contentHash(changed, { include: ["views", "data"] })).not.toBe(
      await contentHash(baseline, { include: ["views", "data"] }),
    );
  });

  it("changes when visible content changes", async () => {
    const changed = workbook();
    const page = changed.views[0];
    if (page.type === "page" && page.content[0]?.type === "paragraph") {
      page.content[0].runs[0] = { type: "text", text: "Contract v2" };
    }
    expect(await contentHash(changed)).not.toBe(await contentHash(workbook()));
  });
});

describe("signature hooks", () => {
  it("signs and verifies canonical bytes with Ed25519", async () => {
    const keyPair = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
    const payloads: Uint8Array[] = [];

    const signature = await signDocument(workbook(), {
      async sign(payload) {
        payloads.push(payload);
        const value = await crypto.subtle.sign({ name: "Ed25519" }, keyPair.privateKey, new Uint8Array(payload));
        return {
          alg: "Ed25519",
          value: base64url(new Uint8Array(value)),
          signedAt: new Date().toISOString(),
          contentHash: await contentHash(workbook()),
        };
      },
    });

    const verifier = {
      async verify(payload: Uint8Array, stored: DocumentSignature) {
        return crypto.subtle.verify(
          { name: "Ed25519" },
          keyPair.publicKey,
          Buffer.from(stored.value, "base64url"),
          new Uint8Array(payload),
        );
      },
    };

    expect(await verifyDocument(workbook(), signature, verifier)).toBe(true);
    expect(payloads).toHaveLength(1);

    const tampered = workbook();
    tampered.data = { customer: { name: "Mallory" } };
    expect(await verifyDocument(tampered, signature, verifier)).toBe(true);

    if (tampered.views[0]?.type === "page" && tampered.views[0].content[0]?.type === "paragraph") {
      tampered.views[0].content[0].runs[0] = { type: "text", text: "Tampered" };
    }
    expect(await verifyDocument(tampered, signature, verifier)).toBe(false);
  });
});

describe("schema migrations", () => {
  it("fails closed for unknown versions and names the supported range", () => {
    const legacy = { ...workbook(), schemaVersion: "3.0.0" } as unknown as WorkbookDefinition;
    expect(() => migrateWorkbook(legacy)).toThrow(/Supported versions: 4\.1\.1/);
  });

  it("applies a registered chain and validates the result", () => {
    registerMigration("4.0.0", "4.1.1", (document) => ({ ...document, schemaVersion: "4.1.1" }));
    const legacy = { ...workbook(), schemaVersion: "4.0.0" } as unknown as WorkbookDefinition;
    const result = migrateWorkbook(legacy);
    expect(result.applied).toEqual(["4.0.0 → 4.1.1"]);
    expect(result.workbook.schemaVersion).toBe("4.1.1");
    expect(supportedSchemaVersions()).toContain("4.0.0");
  });

  it("validates migratd output and rejects invalid documents", () => {
    registerMigration(
      "4.0.0",
      "4.1.1",
      () => ({ kind: "workbook", schemaVersion: "4.1.1" }) as unknown as WorkbookDefinition,
    );
    const legacy = { ...workbook(), schemaVersion: "4.0.0" } as unknown as WorkbookDefinition;
    expect(() => migrateWorkbook(legacy)).toThrow(/failed schema validation/);
  });
});
