import type { Preview } from "@storybook/react";

import "../src/styles/workbook-theme.css";

const preview: Preview = {
  parameters: {
    layout: "fullscreen",
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
      expanded: true,
    },
    options: {
      storySort: {
        order: ["Getting Started", "Quick Start", "Workbook"],
      },
    },
    backgrounds: {
      default: "workspace",
      values: [
        { name: "workspace", value: "#eef3f8" },
        { name: "paper", value: "#ffffff" },
        { name: "dark", value: "#0f172a" },
      ],
    },
    viewport: {
      viewports: {
        mobile: { name: "Mobile 390", styles: { width: "390px", height: "844px" } },
        tablet: { name: "Tablet 768", styles: { width: "768px", height: "1024px" } },
        desktop: { name: "Desktop 1280", styles: { width: "1280px", height: "800px" } },
        widescreen: { name: "Widescreen 1600", styles: { width: "1600px", height: "900px" } },
      },
    },
    a11y: {
      test: "error",
      manual: true,
      config: {
        rules: [{ id: "color-contrast", enabled: true }],
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ minHeight: "100vh", background: "#eef3f8", padding: "24px" }}>
        <Story />
      </div>
    ),
  ],
};

export default preview;
