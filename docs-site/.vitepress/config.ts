import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "@byteforce/workbook",
  description: "BF Workbook v4.1.1 schema-driven runtime for form, page, and sheet views.",

  head: [["link", { rel: "icon", href: "/favicon.ico" }]],

  themeConfig: {
    // Shared across locales unless overridden.
    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/byteforce-cn/workbook",
      },
    ],

    search: {
      provider: "local",
    },

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2026 ByteForce",
    },

    locales: {
      root: {
        label: "English",
        lang: "en-US",
        themeConfig: {
          nav: [
            { text: "Guide", link: "/getting-started" },
            { text: "API", link: "/api/quick-start" },
            {
              text: "Resources",
              items: [
                { text: "Migration", link: "/migration/v0-to-v1" },
                { text: "Schema Reference", link: "/schema/schema-reference" },
                { text: "API Reference (generated)", link: "/api-reference/index.html" },
              ],
            },
          ],

          sidebar: {
            "/": [
              {
                text: "Introduction",
                items: [
                  { text: "Getting Started", link: "/getting-started" },
                  { text: "Installation", link: "/installation" },
                ],
              },
              {
                text: "API Reference",
                items: [
                  { text: "Quick Start API", link: "/api/quick-start" },
                  { text: "Document Renderer", link: "/api/document-renderer" },
                  { text: "Multi-Device Rendering", link: "/api/multi-device" },
                  { text: "Form Renderer", link: "/api/form-renderer" },
                  { text: "Page Renderer", link: "/api/page-renderer" },
                  { text: "Sheet Renderer", link: "/api/sheet-renderer" },
                  { text: "Runtime Utilities", link: "/api/runtime" },
                  { text: "Plugin System", link: "/api/plugin-system" },
                  { text: "Adapters", link: "/api/adapters" },
                ],
              },
              {
                text: "Guides",
                items: [
                  { text: "Custom Field", link: "/guides/custom-field" },
                  { text: "Custom Layout", link: "/guides/custom-layout" },
                  { text: "Custom Validation", link: "/guides/custom-validation" },
                  {
                    text: "Custom Option Source",
                    link: "/guides/custom-option-source",
                  },
                  { text: "Print & Export", link: "/guides/print-and-export" },
                  { text: "Internationalization", link: "/guides/i18n" },
                  { text: "Theming", link: "/guides/theming" },
                  { text: "Performance", link: "/guides/performance" },
                ],
              },
              {
                text: "Migration",
                items: [
                  { text: "v0 → v1 Migration", link: "/migration/v0-to-v1" },
                  {
                    text: "From Other Libraries",
                    link: "/migration/from-other-libs",
                  },
                ],
              },
              {
                text: "Schema",
                items: [
                  { text: "Schema Reference", link: "/schema/schema-reference" },
                  { text: "Schema Playground", link: "/schema/schema-playground" },
                ],
              },
            ],
          },
        },
      },

      "zh-CN": {
        label: "简体中文",
        lang: "zh-CN",
        link: "/zh-CN/",
        themeConfig: {
          nav: [
            { text: "指南", link: "/zh-CN/getting-started" },
            {
              text: "资源",
              items: [
                { text: "完整英文文档", link: "/getting-started" },
                { text: "API Reference", link: "/api-reference/index.html" },
                { text: "GitHub", link: "https://github.com/byteforce-cn/workbook" },
              ],
            },
          ],

          sidebar: {
            "/zh-CN/": [
              {
                text: "介绍",
                items: [
                  { text: "快速开始", link: "/zh-CN/getting-started" },
                  { text: "安装", link: "/zh-CN/installation" },
                ],
              },
              {
                text: "English docs",
                items: [
                  { text: "Getting Started (EN)", link: "/getting-started" },
                  { text: "API Reference (EN)", link: "/api/quick-start" },
                ],
              },
            ],
          },

          footer: {
            message: "基于 MIT 许可证发布。",
            copyright: "Copyright © 2026 ByteForce",
          },
        },
      },
    },
  },

  markdown: {
    theme: {
      light: "github-light",
      dark: "github-dark",
    },
  },
});
