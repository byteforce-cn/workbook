import type { StorybookConfig } from "@storybook/react-vite";
import remarkGfm from "remark-gfm";

const config: StorybookConfig = {
  stories: ["../stories/**/*.mdx", "../stories/**/*.stories.@(ts|tsx)"],
  addons: [
    {
      name: "@storybook/addon-docs",
      options: {
        // MDX 3 does not ship GFM: without this the intro page renders its
        // Markdown tables as raw `| … |---|` paragraphs (issue #73 P0-1).
        // The vite builder reads this from the addon options preset, not from
        // `docs.mdxPluginOptions`.
        mdxPluginOptions: { mdxCompileOptions: { remarkPlugins: [remarkGfm] } },
      },
    },
    "@storybook/addon-a11y",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  docs: {
    autodocs: "tag",
    defaultName: "Docs",
  },
  core: {
    disableTelemetry: true,
  },
};

export default config;
