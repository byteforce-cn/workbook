# AGENTS.md — AI assistant guardrails

Guidance for AI coding assistants (GitHub Copilot & Copilot coding agent, Claude
Code, Cursor, Codex, …) working in this repository. It complements
[`CONTRIBUTING.md`](./CONTRIBUTING.md) and [`SECURITY.md`](./SECURITY.md).
When instructions conflict, **maintainers and those documents win — stop and ask**.

## Non-negotiables

- **Never push to `main`, force-push, or rewrite history.** `main` is protected
  (PRs required, 7 required checks, no force-push/deletion). Work on a branch and
  open a PR; never merge a PR unless a maintainer explicitly asks you to.
- **Never touch the release machinery without explicit instruction**:
  `.github/workflows/release.yml`, npm publishing, git tags, GitHub Releases,
  `CHANGELOG.md` version bumps, or the `version` field in `package.json`.
  Releases flow through Changesets + npm OIDC trusted publishing only —
  `pnpm changeset` is the one sanctioned way version bumps enter a PR.
- **Never commit secrets or internal material** (tokens, `.env*`, internal
  planning docs, private notes). Secret scanning and gitleaks gate CI; if you
  spot credentials anywhere in a diff, stop and report instead of "fixing"
  around them.
- **Never hand-edit generated artifacts**:
  - `src/schema/generated-types.ts` → regenerate with `pnpm generate:types`
    (CI enforces freshness with `git diff --exit-code`),
  - `etc/workbook.api.md` → refresh with `pnpm api:report` (never by hand),
  - `pnpm-lock.yaml` → `pnpm install` (CI uses `--frozen-lockfile`),
  - `dist/`, `storybook-static/`, `docs-site/api-reference/` → build outputs,
    never commit.

## Before proposing any change

Run the same gates CI runs, on a supported Node (>= 20.16; the matrix tests
Node 20 and 22 with React 18/19):

| Gate | Command |
|------|---------|
| Lint & format | `pnpm lint` |
| Types | `pnpm typecheck` |
| Generated types fresh | `pnpm generate:types && git diff --exit-code -- src/schema/generated-types.ts` |
| Unit tests | `pnpm test:unit` |
| Conformance | `pnpm test:conformance` |
| Build + API surface | `pnpm build && pnpm api:check` |
| Storybook + docs | `pnpm build-storybook`, `pnpm docs:build` |
| End-to-end (UI changes) | `pnpm test:e2e` (boots Storybook on `:6008`) |

**Never make a red check green by weakening it.** Coverage thresholds,
bundle-size/performance baselines (`tests/meta/`), conformance fixtures and e2e
assertions are gates, not suggestions. Fix the cause, or explain in the PR why
the gate itself should legitimately change (maintainer sign-off required).

## Dependency policy

- **Runtime deps** (`dependencies`) are bundle-size sensitive — justify any
  addition; `tests/meta/` gates will catch regressions.
- **devDependencies**: patch/minor bumps are routine. **Major bumps need a
  dedicated PR and maintainer sign-off** — evaluate upstream release notes
  first. Known deliberate deferrals: TypeScript majors (until the tsup DTS
  pipeline supports TS 6+), jsdom majors (until Node 20 leaves the CI matrix).
- Security fixes: cite the GHSA/advisory in the PR body; do not work around a
  scanner silently.
- Dependabot opens grouped PRs weekly. Keep dependency churn out of feature PRs.

## CI & workflows

- Do not modify `.github/workflows/**` unless explicitly asked — any change
  there needs careful review (least privilege `permissions`, no unpinned
  third-party actions).
- Required checks: `lint (biome)`, `typecheck + unit` (node 20/22 × react
  18/19), `conformance`, `e2e (playwright)`, `builds (lib + storybook + docs)`.
- If e2e hangs in your environment, retry on Node 20; never skip the suite.

## Repository conventions

- **Tests live where `CONTRIBUTING.md` says**: unit tests co-located with
  sources, conformance fixtures in `tests/fixtures/conformance/`, meta gates in
  `tests/meta/`, e2e in `tests/e2e/`, stories in `stories/`.
- **Style**: Biome is the only formatter/linter (`pnpm lint:fix`); imports are
  auto-sorted; `biome.json` must stay comment-free. TypeScript is strict,
  `verbatimModuleSyntax`, ESM-only.
- **Types are single-sourced**: runtime types in `src/types/runtime.ts`;
  schema-derived types come from the schema pipeline — don't duplicate them.
- **Public API discipline**: additive changes are preferred; breaking changes
  need discussion plus a `major` changeset. The api-extractor report diff in a
  PR must be explainable.
- **i18n**: default runtime copy is Chinese today and e2e asserts it — don't
  change localized strings without updating/checking those assertions.
- **Commits & PRs**: Conventional Commits, small and reviewable, no unrelated
  reformatting. PR description states *what / why / how verified* (list the
  gates you ran). Disclose AI assistance, and never self-approve.

## Definition of done

- [ ] Lint, typecheck, unit, conformance green
- [ ] Generated-types freshness check green
- [ ] Build + `api:check` green (`etc/workbook.api.md` refreshed only if the
      surface legitimately changed)
- [ ] e2e green for renderer/UI changes; Storybook + docs build for related changes
- [ ] Changeset added for user-visible changes
- [ ] PR opened (not self-merged), CI fully green, maintainer review requested

---

## 中文摘要（中文维护者/助手速览）

- 不直推 `main`（保护分支：必须 PR + 7 项必需检查）；不 force-push、不自我合并。
- 不碰发布机制：`release.yml`、npm 发布、tag、GitHub Release、版本号/CHANGELOG——只通过 `pnpm changeset` 走流程。
- 不手改生成物：`src/schema/generated-types.ts`（`pnpm generate:types`）、`etc/workbook.api.md`（`pnpm api:report`）、`pnpm-lock.yaml`（`pnpm install`）。
- 不提交任何凭据/内部材料；发现泄漏立即停止并上报。
- 依赖政策：运行时依赖需论证（bundle-size 门禁）；devDeps major 需专项 PR + 维护者签核（TypeScript、jsdom 已明确暂缓）。
- 提 PR 前门禁全绿（lint/typecheck/unit/conformance/build+api:check；UI 改动加 e2e），并附 changeset。
- 禁止通过弱化测试、阈值或断言来"修绿"CI。
