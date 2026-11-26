/**
 * Numbers quoted on the "Getting Started" page.
 *
 * They are constants rather than prose so they cannot drift silently:
 * `stories/storybookStats.test.ts` recomputes them from `stories/*.stories.tsx`
 * and `tests/e2e/*.spec.ts` and fails when they disagree. Update both together.
 *
 * `storyCount` counts exported stories, `specCount` counts e2e spec files and
 * `testCount` counts top-level `test(...)` calls inside them.
 */
export const storyCount = 48;
export const specCount = 16;
export const testCount = 58;

/** Number of autodocs pages (`--docs` entries) in the Storybook index. */
export const docPageCount = 16;
