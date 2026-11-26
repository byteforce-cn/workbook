import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: {
    index: "src/index.ts",
    core: "src/core/index.ts",
    react: "src/react/index.ts",
    "react-native": "src/react-native/index.tsx",
    quick: "src/quick/index.ts",
    "adapters/zod": "src/adapters/zod/adapter.ts",
    editor: "src/editor/index.ts",
  },
  format: ["esm"],
  // Shared chunks across entries so mixing `.` and `./react` never yields
  // duplicated module instances (e.g. two React Contexts for the same state).
  splitting: true,
  dts: true,
  sourcemap: true,
  clean: !options.watch,
  external: [
    "react",
    "react-dom",
    "react-native",
    "@tiptap/core",
    "@tiptap/pm",
    "@tiptap/react",
    "@tiptap/extension-text",
  ],
  jsx: "react-jsx",
  target: "es2022",
  outDir: "dist",
}));
