# Content Security Policy

`@byteforce/workbook` is designed to run under a strict CSP:

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
```

- **No `script-src 'unsafe-eval'`** — the library never calls `new Function` or
  `eval`, and sheet formulas are parsed directly instead of compiled. A gate in
  `tests/meta/csp.test.ts` keeps it that way.
- **No `img-src data:`** — the theme draws its own icons (for example the
  `<select>` chevron) with gradients instead of `data:` images.
- **`style-src 'unsafe-inline'`** is required, because the renderers set
  computed styles (page layout, sheet grid, column widths) inline. This is a
  style directive; it does not allow script execution.

## Document validation

By default `DocumentRenderer` validates its document with a validator compiled
from `bf-schema-v4.1.1.json` at runtime by AJV. AJV generates that validator
with `new Function`, which a `script-src 'self'` policy blocks — the render
would fail with an error naming this guide.

Two ways out:

**1. Precompile the validator (recommended, no CSP relaxation).**

Generate a standalone validator from the schema the package ships, at your build
time, and pass it in:

```ts
// scripts/generate-workbook-validator.mjs — run during your build
import Ajv from "ajv";
import addFormats from "ajv-formats";
import standaloneCode from "ajv/dist/standalone/index.js";
import { writeFileSync } from "node:fs";
import { workbookSchemaJson } from "@byteforce/workbook";

const ajv = new Ajv({ allErrors: true, strict: false, code: { source: true, esm: true } });
addFormats(ajv);
const validate = ajv.compile(workbookSchemaJson);
writeFileSync("src/generated/workbook-validator.js", standaloneCode(ajv, validate));
```

```tsx
import { DocumentRenderer } from "@byteforce/workbook";
import validateWorkbook from "./generated/workbook-validator.js";

const validate = (document: unknown) => {
  const valid = validateWorkbook(document);
  return { valid, errors: valid ? [] : (validateWorkbook.errors ?? []) };
};

<DocumentRenderer workbook={workbook} validate={validate} />;
```

The generated module is plain JavaScript (a few hundred kilobytes, ~47 KB
gzipped for the full schema), so it does not require `'unsafe-eval'` and is
bundled like any other module. Code-split it if you only validate occasionally.

**2. Allow `'unsafe-eval'` in `script-src`.**

Keeps the default behaviour, but it weakens the policy for every script on the
page — prefer option 1 in production.

## Validating outside the renderer

`validateWorkbookDocument(document)` is the same runtime-compiling validator,
exported for hosts that validate before rendering. It throws the same
explanatory error under a strict CSP, so precompile your own validator (option 1
above) if you validate in your own code.
