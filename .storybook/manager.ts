import { addons } from "storybook/manager-api";
import { create } from "storybook/theming/create";

const workbookTheme = create({
  base: "light",
  brandTitle: "BF Workbook · Schema-Driven Forms",
  brandUrl: "https://github.com/byteforce-cn/workbook",
  brandTarget: "_self",
  appBg: "#f8fafc",
  appContentBg: "#ffffff",
  appBorderColor: "#dbe4f0",
  appBorderRadius: 8,
  colorPrimary: "#2563eb",
  colorSecondary: "#0f172a",
  textColor: "#172033",
  textInverseColor: "#ffffff",
  barBg: "#ffffff",
  barTextColor: "#475569",
  barSelectedColor: "#2563eb",
  inputBg: "#ffffff",
  inputBorder: "#cbd5e1",
  inputTextColor: "#111827",
  fontBase: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  fontCode: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
});

addons.setConfig({
  theme: workbookTheme,
  sidebar: {
    showRoots: true,
    collapsedRoots: ["Workbook"],
  },
  toolbar: {
    title: { hidden: false },
    remount: { hidden: false },
  },
});
