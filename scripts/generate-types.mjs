import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compileFromFile } from "json-schema-to-typescript";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFile);
const schemaPath = resolve(currentDir, "../src/schema/bf-schema-v4.1.1.json");
const outputPath = resolve(currentDir, "../src/schema/generated-types.ts");

const output = await compileFromFile(schemaPath, {
  bannerComment:
    "/**\n * This file is auto-generated from src/schema/bf-schema-v4.1.1.json.\n * Run `pnpm generate:types` to regenerate it. Do not edit manually.\n */",
  cwd: resolve(currentDir, ".."),
  strictIndexSignatures: true,
  additionalProperties: false,
  unreachableDefinitions: true,
  enableConstEnums: false,
});

const outputWithAlias = `${output}\nexport type WorkbookDefinition = BFDocumentSchemaV411;\n`;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, outputWithAlias, "utf8");
