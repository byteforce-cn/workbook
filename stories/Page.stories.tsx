import type { Meta, StoryObj } from "@storybook/react";
import { type ReactNode, useMemo, useState } from "react";
import type { PageViewDefinition, WorkbookData } from "../src/core/types";
import { DocumentRenderer } from "../src/DocumentRenderer";
import { layoutPageView } from "../src/renderers/page/pageLayout";
import type { WorkbookDefinition } from "../src/schema/generated-types";
import { CodeBlock, StoryShell } from "./StoryShell";
import {
  createComplexTablesWorkbook,
  createFloatingBlocksWorkbook,
  createHeadersFootersWorkbook,
  createWatermarkWorkbook,
  type WatermarkMode,
} from "./workbookPageSheetFixtures";

const meta = {
  title: "Workbook/Page",
  component: DocumentRenderer,
  tags: ["autodocs"],
} satisfies Meta<typeof DocumentRenderer>;

export default meta;

// Render-only demos, so keep args untyped.
type Story = StoryObj;

function PageStoryDemo({
  workbook,
  testId,
  title,
  caption,
  capabilities,
  code,
  inspector,
}: {
  workbook: WorkbookDefinition;
  testId: string;
  title: string;
  caption: string;
  capabilities: string[];
  code: string;
  inspector?: ReactNode;
}) {
  const pageView = workbook.views.find((view): view is PageViewDefinition => view.type === "page");
  const layout = useMemo(
    () => (pageView == null ? undefined : layoutPageView(pageView, { data: workbook.data as WorkbookData })),
    [pageView, workbook.data],
  );

  return (
    <StoryShell
      testId={testId}
      title={title}
      caption={caption}
      capabilities={capabilities}
      code={code}
      inspector={
        <div style={{ display: "grid", gap: "10px" }}>
          <h3 style={{ margin: 0, fontSize: "15px" }}>分页统计</h3>
          <dl style={{ margin: 0, display: "grid", gap: "6px", fontSize: "13px", color: "#172033" }}>
            <div>
              <dt style={{ display: "inline", color: "#64748b" }}>页面数 </dt>
              <dd data-testid={`${testId}-page-count`} style={{ display: "inline", margin: 0, fontWeight: 700 }}>
                {layout?.pages.length ?? 0}
              </dd>
            </div>
          </dl>
          {inspector}
        </div>
      }
    >
      <DocumentRenderer workbook={workbook} />
    </StoryShell>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Watermarks                                                       */
/* ------------------------------------------------------------------ */

const WATERMARK_MODES: Array<{ id: WatermarkMode; label: string }> = [
  { id: "text-single", label: "文本 · 居中" },
  { id: "text-tiled", label: "文本 · 平铺" },
  { id: "image-tiled", label: "图片 · 平铺" },
];

function WatermarksDemo() {
  const [mode, setMode] = useState<WatermarkMode>("text-single");
  const workbook = useMemo(() => createWatermarkWorkbook(mode), [mode]);
  const pageView = workbook.views.find((view): view is PageViewDefinition => view.type === "page");

  return (
    <StoryShell
      testId="workbook-story-page-watermarks"
      title="水印"
      caption="文本水印（居中 / 平铺）与图片水印（平铺）三态切换，水印层叠加于正文之上，不参与文档流排版。"
      capabilities={["文本水印", "图片水印", "平铺", "旋转/透明度"]}
      code={`// 文本水印（居中，不 repeat）
{ type: "watermark", text: "机密", fontSize: 56, color: "#dc2626", opacity: 0.14, rotation: -30 }

// 文本水印（平铺）
{ type: "watermark", text: "BYTEFORCE", fontSize: 40, color: "#cbd5e1", opacity: 0.55, rotation: -28, repeat: true }

// 图片水印（平铺）—— 图片资源在 workbook.assets 中声明
assets: { seal: { src: "data:image/svg+xml;...", type: "image/svg+xml" } },
{ type: "watermark", text: "", image: "seal", repeat: true, opacity: 0.16, rotation: -18 }`}
      inspector={
        <div style={{ display: "grid", gap: "12px" }}>
          <h3 style={{ margin: 0, fontSize: "15px" }}>水印模式</h3>
          <div role="group" aria-label="水印模式" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {WATERMARK_MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                data-testid={`workbook-story-page-watermarks-mode-${item.id}`}
                aria-pressed={mode === item.id}
                onClick={() => setMode(item.id)}
                style={{
                  minHeight: "34px",
                  borderRadius: "6px",
                  border: mode === item.id ? "1px solid #2563eb" : "1px solid #cbd5e1",
                  background: mode === item.id ? "#eff6ff" : "#ffffff",
                  color: mode === item.id ? "#1d4ed8" : "#172033",
                  cursor: "pointer",
                  fontWeight: 700,
                  padding: "6px 12px",
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p style={{ margin: 0, color: "#526173", fontSize: "13px", lineHeight: 1.6 }}>
            当前水印块定义如下，修改 mode 即时重新排版渲染。
          </p>
          {pageView != null ? (
            <CodeBlock code={JSON.stringify(pageView.content[0], null, 2)} maxHeight="240px" />
          ) : null}
        </div>
      }
    >
      <DocumentRenderer workbook={workbook} />
    </StoryShell>
  );
}

export const Watermarks: Story = {
  render: () => <WatermarksDemo />,
};

/* ------------------------------------------------------------------ */
/* 2. Headers & Footers                                                */
/* ------------------------------------------------------------------ */

export const HeadersFooters: Story = {
  render: () => (
    <PageStoryDemo
      workbook={createHeadersFootersWorkbook()}
      testId="workbook-story-page-headers-footers"
      title="页眉页脚分页规则"
      caption="首页 / 奇偶页差异化页眉页脚：3 页文档演示 showOnFirstPage、showOnEvenPages、showOnOddPages 与左右中对齐。"
      capabilities={["首页不同", "奇偶页不同", "对齐方式"]}
      code={`// 页眉：仅首页显示，右对齐
{ type: "header", alignment: "right", showOnFirstPage: true, content: [
  { type: "paragraph", runs: [{ type: "text", text: "首页页眉 · 项目名称" }] },
] },

// 页眉：仅偶数页显示，左对齐
{ type: "header", alignment: "left", showOnEvenPages: true, content: [...] },

// 页脚：仅奇数页显示，居中
{ type: "footer", alignment: "center", showOnOddPages: true, content: [...] }`}
      inspector={
        <div style={{ display: "grid", gap: "8px", fontSize: "13px", color: "#526173", lineHeight: 1.6 }}>
          <p style={{ margin: 0 }}>第 1 页：首页页眉（右）+ 奇数页页脚（中）</p>
          <p style={{ margin: 0 }}>第 2 页：偶数页页眉（左）+ 偶数页页脚（右）</p>
          <p style={{ margin: 0 }}>第 3 页：奇数页页脚（中），首页页眉不再出现</p>
        </div>
      }
    />
  ),
};

/* ------------------------------------------------------------------ */
/* 3. Floating blocks                                                  */
/* ------------------------------------------------------------------ */

export const FloatingBlocks: Story = {
  render: () => (
    <PageStoryDemo
      workbook={createFloatingBlocksWorkbook()}
      testId="workbook-story-page-floating-blocks"
      title="浮动块定位"
      caption="绝对坐标（数字）与百分比定位（字符串）两种浮动块，悬浮于文档流之上，正文流不受影响。"
      capabilities={["绝对定位", "百分比定位", "图片浮动块"]}
      code={`// 绝对定位（数字坐标）
{
  type: "floating",
  layout: { x: 36, y: 48, width: 220, height: 64 },
  content: { type: "paragraph", runs: [{ type: "text", text: "绝对定位浮动段落" }] },
}

// 百分比定位（字符串，相对页面宽高）
{
  type: "floating",
  layout: { x: "50%", y: "25%", width: "24%", height: "12%" },
  content: { type: "image", src: "badge", alt: "浮动图章", width: 90, height: 90 },
}`}
      inspector={
        <div style={{ display: "grid", gap: "8px", fontSize: "13px", color: "#526173", lineHeight: 1.6 }}>
          <p style={{ margin: 0 }}>
            浮动块 ①：<code>x=36, y=48</code>（绝对定位段落）
          </p>
          <p style={{ margin: 0 }}>
            浮动块 ②：<code>x="50%", y="25%"</code>（百分比定位图片，本地 SVG data-URI 资源）
          </p>
        </div>
      }
    />
  ),
};

/* ------------------------------------------------------------------ */
/* 4. Complex tables                                                   */
/* ------------------------------------------------------------------ */

export const ComplexTables: Story = {
  render: () => (
    <PageStoryDemo
      workbook={createComplexTablesWorkbook()}
      testId="workbook-story-page-complex-tables"
      title="复杂表格"
      caption="colSpan / rowSpan 合并单元格 + 40 行明细表自动跨页拆分，边框由 border 声明。"
      capabilities={["colSpan", "rowSpan", "跨页拆分", "边框样式"]}
      code={`// 合并单元格：colSpan / rowSpan
{
  type: "table",
  columns: [150, 150, 150, 150],
  border: { style: "thin", color: "#334155" },
  rows: [
    { cells: [
      { colSpan: 2, content: [{ type: "paragraph", alignment: "center", runs: [{ type: "text", text: "合并标题 A" }] }] },
      { rowSpan: 2, content: [{ type: "paragraph", runs: [{ type: "text", text: "垂直合并" }] }] },
    ] },
    // ... 超出页面高度时表格自动拆分到下一页
  ],
}`}
      inspector={
        <div style={{ display: "grid", gap: "8px", fontSize: "13px", color: "#526173", lineHeight: 1.6 }}>
          <p style={{ margin: 0 }}>上方：合并单元格（colSpan / rowSpan）演示</p>
          <p style={{ margin: 0 }}>下方：40 行明细表，超出单页可用高度后自动跨页拆分（页面数 &gt; 1）</p>
        </div>
      }
    />
  ),
};
