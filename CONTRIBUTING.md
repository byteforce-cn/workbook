# Contributing to @byteforce/workbook

Thanks for your interest in improving **@byteforce/workbook** — a schema-driven
runtime for forms, documents and sheet views. This guide covers everything you
need to build, test and submit changes.

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20.16+ (LTS) or newer |
| pnpm | 10.x (`corepack enable` picks up the pinned version) |
| Git | any recent version |

First-time setup:

```bash
git clone https://github.com/byteforce-cn/workbook.git
cd workbook
corepack enable
pnpm install
pnpm generate:types          # regenerate schema-derived TypeScript types
pnpm exec playwright install chromium   # one-time, for e2e tests
```

Then verify your environment:

```bash
pnpm typecheck
pnpm test:unit
```

## Repository layout

```
src/
├── core/            Framework-agnostic engine (zero React dependency)
├── react/           React binding layer (providers, hooks, registry, error boundaries)
├── react-native/    Experimental React Native renderers (`./react-native` entry)
├── renderers/
│   ├── form/        Form renderer (fields, layout, validation)
│   ├── page/        SVG page renderer + pagination engine
│   └── sheet/       Canvas sheet renderer
├── export/          Print HTML and binary PDF export
├── device/          Responsive (desktop / tablet / mobile) wrappers
├── quick/           Zero-config SimpleForm API
├── adapters/        Optional adapters (e.g. zod)
├── schema/          JSON schema + generated types + validator
└── styles/          Default theme CSS + conditional style engine
tests/
├── fixtures/        Conformance & integration fixtures + conformance runner
├── meta/            Bundle-size & performance baseline gates
└── e2e/             Playwright specs (run against Storybook)
stories/             Storybook stories and mock data
docs-site/           VitePress documentation site
scripts/             Type-generation and maintenance scripts
```

### Layout & test placement rules

- **Unit tests are co-located** with the code they cover: `*.test.ts` / `*.test.tsx`.
- **Conformance fixtures** live in `tests/fixtures/conformance/` (valid/invalid
  JSON per capability; they run through `pnpm test:conformance`).
- **Meta quality gates** (bundle size, performance baseline) live in `tests/meta/`.
- **End-to-end tests** live in `tests/e2e/` (Playwright, driven through Storybook stories).
- **Stories** live in `stories/` (root level, built by Storybook).
- `pnpm-workspace.yaml` only pins pnpm settings — this is a **single package**,
  not a monorepo.

## Common commands

| Command | What it does |
|---------|--------------|
| `pnpm build` | `generate:types` + bundle `dist/` (tsup) |
| `pnpm dev` | tsup watch mode |
| `pnpm typecheck` | `tsc --noEmit` over the whole repo |
| `pnpm lint` | Biome check (lint + format + import order) |
| `pnpm test:unit` | Vitest unit + integration tests |
| `pnpm test:conformance` | Schema conformance fixtures |
| `pnpm test:e2e` | Playwright e2e (boots Storybook automatically) |
| `pnpm test` | unit + conformance + e2e |
| `pnpm storybook` | Storybook dev server on :6008 |
| `pnpm build-storybook` | Static Storybook build |
| `pnpm docs:dev` / `pnpm docs:build` | VitePress docs site |
| `pnpm docs:api` | TypeDoc API reference |
| `pnpm api:check` | API Extractor report check (run after `pnpm build`) |

## Engineering conventions

- **Schema-first.** Read `src/schema/bf-schema-v4.1.1.json` before writing code.
  Do not invent private protocols; if the schema is missing something, land the
  schema change (with conformance fixtures) first.
- **TDD.** Start with a failing test, then implement.
- **Immutable data.** All data mutations go through `immer` helpers — never
  mutate the workbook data tree directly.
- **Never silently ignore.** Accepted-but-unimplemented schema fields must be
  marked in the support matrix (`src/schema/support-matrix.ts`) with a reason.
- **One capability, four layers.** A new capability is done when it has:
  types → runtime logic → tests/stories → documentation.
- **`src/core/` stays framework-agnostic.** No React imports there (the React
  binding layer lives in `src/react/` and `src/renderers/`).
- **Generated code is generated.** `src/schema/generated-types.ts` is produced
  by `pnpm generate:types`; manual edits are rejected by CI drift checks.
- **TypeScript strict.** Keep the build green — no `any` escapes in production code.

Before opening a PR, run at minimum:

```bash
pnpm typecheck
pnpm test:unit
pnpm test:conformance      # when you touched schema, validators or renderers
```

## Commit & pull request guidelines

- Use [Conventional Commits](https://www.conventionalcommits.org/) style
  prefixes: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- Keep PRs focused; one topic per PR. Reference an issue where possible.
- User-facing changes (new exports, behavior changes, fixes) should come with a
  changeset: `pnpm changeset` (see `.changeset/`).
- All PRs must pass CI (lint / typecheck / unit / conformance / e2e / builds).

## Developer Certificate of Origin (DCO)

This project uses the [Developer Certificate of Origin](https://developercertificate.org/).
Every commit must be signed off:

```bash
git commit -s -m "feat: add something"
```

which appends `Signed-off-by: Your Name <you@example.com>` to the commit
message, certifying that you have the right to contribute the code.

## Release process (maintainers)

1. Merge the changesets release PR (`Version Packages`).
2. CI publishes to npm with provenance (`release.yml`).
3. Docs site and Storybook deploy from the release tag (`deploy-docs.yml`).

## Deprecation policy

- Deprecated APIs are announced in a **minor** release with a `@deprecated`
  JSDoc tag and a note in the changelog.
- Removal happens no earlier than the **next major** release, and never sooner
  than 6 months after the deprecation lands.

## Community

- Please follow our [Code of Conduct](./CODE_OF_CONDUCT.md).
- Security issues: see [SECURITY.md](./SECURITY.md) — do **not** open public issues.
- Questions and ideas: use GitHub Discussions / Issues.
