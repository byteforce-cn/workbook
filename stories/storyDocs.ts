/**
 * Shared shape for a per-story "what to look at" note.
 *
 * Storybook renders it under the story heading on the autodocs page. Keep each
 * note to 2–3 sentences: the场景, what to do in the canvas, and what should
 * happen. Component-level background belongs in `docs.description.component`
 * on the story file's `meta`, not here.
 */
export function storyNote(description: string) {
  return { docs: { description: { story: description } } };
}

/** Renders a GitHub source link for a path inside this repository. */
export function sourceLink(path: string, label = path): string {
  return `[\`${label}\`](https://github.com/byteforce-cn/workbook/blob/main/${path})`;
}

/** Renders a link to a page of the published VitePress docs site. */
export function docsLink(path: string, label = path): string {
  return `[\`${label}\`](https://byteforce-cn.github.io/workbook/${path})`;
}
