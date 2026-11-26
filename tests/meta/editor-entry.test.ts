/**
 * Editor entry isolation gates.
 *
 * The editor is an optional peer-heavy entry. Two properties are load-bearing:
 * Tiptap/ProseMirror must not leak into the main entries, and the editor must
 * not pull in the React Native renderer.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const DIST_DIR = resolve(import.meta.dirname ?? __dirname, "../../dist");
const distAvailable = existsSync(resolve(DIST_DIR, "editor.js"));

const MAIN_ENTRIES = ["index.js", "core.js", "react.js", "quick.js", "react-native.js"];

describe("editor entry isolation", () => {
  if (!distAvailable) {
    it.skip("editor entry gates (run `pnpm build` first)", () => {});
    return;
  }

  it("ships editor.js and editor.d.ts", () => {
    expect(existsSync(resolve(DIST_DIR, "editor.js"))).toBe(true);
    expect(existsSync(resolve(DIST_DIR, "editor.d.ts"))).toBe(true);
  });

  it("keeps Tiptap and ProseMirror out of every main entry", () => {
    for (const entry of MAIN_ENTRIES) {
      const source = readFileSync(resolve(DIST_DIR, entry), "utf8");
      expect(source, `${entry} must not reference @tiptap/`).not.toMatch(/@tiptap\//);
      expect(source, `${entry} must not reference prosemirror-`).not.toMatch(/prosemirror-/);
    }
  });

  it("keeps the React Native renderer out of the editor entry", () => {
    const source = readFileSync(resolve(DIST_DIR, "editor.js"), "utf8");
    expect(source).not.toMatch(/react-native/);
  });
});
