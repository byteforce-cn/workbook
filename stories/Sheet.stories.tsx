import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { DocumentRenderer } from "../src/DocumentRenderer";
import { StoryShell } from "./StoryShell";
import { docsLink, sourceLink, storyNote } from "./storyDocs";
import {
  createFormulasWorkbook,
  createFrozenPanesWorkbook,
  createStretchWorkbook,
  createVirtualScrollWorkbook,
} from "./workbookPageSheetFixtures";

const componentDocs = `### 适用场景
台账、报价明细、对账单这类行列都多、需要冻结、公式或虚拟滚动的场景，用 \`sheet\` 视图，不要拿表格字段硬撑。

### 最小可运行示例
\`\`\`tsx
views: [{
  type: "sheet",
  id: "ledger",
  label: "明细账",
  widthMode: "stretch",      // "fixed" | "stretch"
  frozenRows: 1,
  frozenCols: 1,
  columns: [{ width: 120 }, { width: 180 }],
  rows: [{ height: 32, cells: [{ column: 0, value: "编号" }] }],
}]
\`\`\`

### API
- \`widthMode\`：\`fixed\` 保留自然列宽并居中，\`stretch\` 铺满容器（受列 \`minWidth\` / \`maxWidth\` 约束）。
- \`frozenRows\` / \`frozenCols\`：冻结行列数，四窗格各自独立 Canvas 绘制。
- 单元格支持 \`value\` / \`formula\`（SUM、AVG 等）/ \`style\`；行高与列宽可单独指定。
- 行数超过阈值时自动启用虚拟滚动。

### 边界与错误
- 公式只支持内置函数，未识别函数按文本处理，不抛错。
- 冻结行/列数大于数据尺寸时只冻结实际存在的行列。
- 屏幕阅读器读到的是隐藏的 HTML 表格回退，而不是 Canvas 内容。

### 源码
${sourceLink("src/renderers/sheet/SheetView.tsx")} · ${docsLink("guides/performance", "guides/performance")}`;

const meta = {
  title: "Workbook/Sheet",
  component: DocumentRenderer,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: componentDocs } } },
} satisfies Meta<typeof DocumentRenderer>;

export default meta;

// Render-only demos, so keep args untyped.
type Story = StoryObj;

/* ------------------------------------------------------------------ */
/* 1. Frozen panes                                                     */
/* ------------------------------------------------------------------ */

export const FrozenPanes: Story = {
  parameters: storyNote(
    "在表格里向上下左右滚动：首行与首列保持不动，四窗格各自绘制。对照右侧「DOM 结构」可以确认 pane 划分。",
  ),
  render: () => (
    <StoryShell
      testId="workbook-story-sheet-frozen-panes"
      title="冻结窗格"
      caption="冻结首行 + 首列：滚动时冻结区保持不动，corner / top / left / body 四窗格独立 Canvas 绘制。"
      capabilities={["冻结行", "冻结列", "四窗格", "单元格样式"]}
      code={`// schema 声明即可，无需业务代码
views: [{
  type: "sheet",
  name: "冻结窗格",
  frozenRows: 1,   // 冻结首行
  frozenCols: 1,   // 冻结首列
  columns: [{ width: 120 }, { width: 180 }, ...],
  rows: [
    { height: 36, cells: [{ column: 0, value: "任务编号", style: "sheetHeader" }, ...] },
    { height: 32, cells: [{ column: 0, value: "R1C1" }, ...] },
    // ...
  ],
}]`}
      inspector={
        <div style={{ display: "grid", gap: "8px", fontSize: "13px", color: "#526173", lineHeight: 1.6 }}>
          <p style={{ margin: 0 }}>
            DOM 结构：<code>bf-sheet-viewport</code> 内包含四窗格
          </p>
          <p style={{ margin: 0 }}>
            <code>pane-corner</code>：冻结行 + 冻结列交叉区（左上角）
          </p>
          <p style={{ margin: 0 }}>
            <code>pane-top</code>：冻结行、可横向滚动区（右上）
          </p>
          <p style={{ margin: 0 }}>
            <code>pane-left</code>：冻结列、可纵向滚动区（左下）
          </p>
          <p style={{ margin: 0 }}>
            <code>pane-body</code>：主滚动区（右下）
          </p>
        </div>
      }
    >
      <DocumentRenderer workbook={createFrozenPanesWorkbook()} />
    </StoryShell>
  ),
};

/* ------------------------------------------------------------------ */
/* 2. Adaptive width (widthMode)                                       */
/* ------------------------------------------------------------------ */

function StretchWidthPanel() {
  const [widthMode, setWidthMode] = useState<"fixed" | "stretch">("stretch");

  return (
    <StoryShell
      testId="workbook-story-sheet-stretch-width"
      title="自适应宽度（widthMode）"
      caption="fixed 保持自然列宽（宽容器右侧留白、sheet 居中）；stretch 把多余容器宽度按比例分配给各列铺满容器，并尊重列 maxWidth 上限。"
      capabilities={["widthMode", "stretch 拉伸", "容器自适应", "HiDPI"]}
      width="900px"
      code={`// schema 声明即可，无需业务代码
views: [{
  type: "sheet",
  name: "自适应宽度台账",
  widthMode: "stretch",            // "fixed" | "stretch"
  frozenRows: 1,
  frozenCols: 1,
  columns: [
    { width: 90, minWidth: 60 },
    { width: 120, maxWidth: 180 },  // stretch 时受 maxWidth 约束
    { width: 100 },
    // ...
  ],
  rows: [ /* ... */ ],
}]`}
    >
      <div
        data-testid="stretch-width-controls"
        style={{
          display: "grid",
          gap: "10px",
          border: "1px solid #d7e0ea",
          borderRadius: "8px",
          background: "#f8fafc",
          padding: "12px 14px",
          fontSize: "13px",
          color: "#526173",
          lineHeight: 1.6,
        }}
      >
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {(["fixed", "stretch"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              data-testid={`width-mode-${mode}`}
              aria-pressed={widthMode === mode}
              onClick={() => setWidthMode(mode)}
              style={{
                minHeight: "34px",
                border: widthMode === mode ? "1px solid #2563eb" : "1px solid #cbd5e1",
                borderRadius: "6px",
                background: widthMode === mode ? "#eff6ff" : "#ffffff",
                color: widthMode === mode ? "#1d4ed8" : "#172033",
                cursor: "pointer",
                fontWeight: 700,
                padding: "6px 12px",
              }}
            >
              {mode === "fixed" ? "fixed（固定列宽）" : "stretch（铺满容器）"}
            </button>
          ))}
        </div>
        <p style={{ margin: 0 }}>容器宽度 820px；自然列宽合计 610px（第二列 maxWidth=180）。</p>
        <p style={{ margin: 0 }}>
          <code>stretch</code>：多余 210px 按比例分给各列（受 maxWidth 约束），铺满 820px。
        </p>
        <p style={{ margin: 0 }}>
          <code>fixed</code>：保持 610px 并在容器内居中，右侧留白。
        </p>
        <p style={{ margin: 0 }}>HiDPI 下 canvas 按 devicePixelRatio 分配 backing store；超大表自动降采样保底。</p>
      </div>
      <div style={{ width: 820 }}>
        <DocumentRenderer workbook={createStretchWorkbook(widthMode)} />
      </div>
    </StoryShell>
  );
}

export const StretchToWidth: Story = {
  parameters: storyNote(
    "切换 fixed / stretch：stretch 下列宽按容器等比放大，但不会超过列声明的 maxWidth；fixed 保留自然宽并居中。",
  ),
  render: () => <StretchWidthPanel />,
};

/* ------------------------------------------------------------------ */
/* 3. Formulas                                                         */
/* ------------------------------------------------------------------ */

const FORMULA_EXPECTATIONS = [
  { formula: "=B2*C2", label: "单元格引用 · 算术", result: "2 × 12000 = 24000" },
  { formula: "=SUM(B2:B5)", label: "SUM 范围聚合", result: "数量合计 = 9" },
  { formula: "=SUM(D2:D5)", label: "SUM 引用公式列", result: "小计合计 = 66600" },
  { formula: "=AVG(B2:B5)", label: "AVG 平均值", result: "9 ÷ 4 = 2.25" },
  { formula: "=MAX(C2:C5)", label: "MAX 最大值", result: "最高单价 = 15000" },
] as const;

export const Formulas: Story = {
  parameters: storyNote(
    "改任意数值单元格：SUM / AVG 结果立即重算，公式写在单元格上而不是业务代码里。把引用格清空可以看空值参与运算的结果。",
  ),
  render: () => (
    <StoryShell
      testId="workbook-story-sheet-formulas"
      title="公式计算"
      caption="单元格引用（=B2*C2）与聚合函数（SUM / AVG / MAX）在 Canvas 上实时求值，支持 currency 格式化。"
      capabilities={["A1 引用", "SUM/AVG/MIN/MAX", "格式：currency"]}
      code={`// 单元格引用与算术运算
{ column: 3, formula: "=B2*C2", format: "currency" },

// 聚合函数 + 范围引用
{ column: 1, formula: "=SUM(B2:B5)" },
{ column: 3, formula: "=SUM(D2:D5)", format: "currency" },

// 公式可引用其他公式单元格（递归求值 + 循环保护）
{ column: 3, formula: "=MAX(C2:C5)", format: "currency" }`}
      inspector={
        <div data-testid="workbook-story-sheet-formulas-matrix" style={{ display: "grid", gap: "8px" }}>
          <h3 style={{ margin: 0, fontSize: "15px" }}>公式求值对照</h3>
          {FORMULA_EXPECTATIONS.map((row) => (
            <div
              key={row.formula}
              data-testid={`sheet-formula-${row.formula.replace(/[^A-Z0-9]/gi, "")}`}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: "8px",
                alignItems: "center",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "8px 10px",
                background: "#f8fafc",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#172033" }}>{row.label}</div>
                <code style={{ fontSize: "11px", color: "#64748b" }}>{row.formula}</code>
              </div>
              <strong style={{ color: "#15803d", fontSize: "12px", fontFamily: "ui-monospace, monospace" }}>
                {row.result}
              </strong>
            </div>
          ))}
        </div>
      }
    >
      <DocumentRenderer workbook={createFormulasWorkbook()} />
    </StoryShell>
  ),
};

/* ------------------------------------------------------------------ */
/* 4. Virtual scroll                                                   */
/* ------------------------------------------------------------------ */

export const VirtualScroll: Story = {
  parameters: storyNote("300 行台账：快速拖动滚动条，行被惰渲染但序号与内容对得上；注意滚动时冻结区与视口的对齐。"),
  render: () => (
    <StoryShell
      testId="workbook-story-sheet-virtual-scroll"
      title="虚拟滚动"
      caption="300 行台账由 rowBind 从数据树动态生成，Canvas 仅绘制可见区域，滚动保持流畅。"
      capabilities={["rowBind", "虚拟化渲染", "大数据量"]}
      code={`// 数据树中的数组驱动行生成
data: { ledger: [{ id: 1, name: "任务 1", ... }, ...300 项] },

views: [{
  type: "sheet",
  name: "大规模台账",
  columns: [{ width: 90 }, { width: 240 }, ...],
  rowBind: {
    path: "ledger",
    rowTemplate: {
      height: 30,
      cellMapping: {
        "0": { bind: { path: "id", mode: "oneWay" } },
        "1": { bind: { path: "name", mode: "oneWay" } },
        "4": { bind: { path: "amount", mode: "oneWay" }, format: "currency" },
      },
    },
  },
}]`}
      inspector={
        <div style={{ display: "grid", gap: "8px", fontSize: "13px", color: "#526173", lineHeight: 1.6 }}>
          <p style={{ margin: 0 }}>数据规模：300 行 × 6 列（rowBind 动态物化）</p>
          <p style={{ margin: 0 }}>
            实现：Canvas 绘制 + <code>computeVisibleRange</code> 虚拟化，仅绘制可见行列。
          </p>
          <p style={{ margin: 0 }}>
            滚动容器：<code>bf-sheet-scroll-viewport</code>；画布：<code>bf-sheet-virtual-canvas</code>。
          </p>
          <p style={{ margin: 0 }}>无障碍回退：隐藏 HTML 表格物化全部 300 行供屏幕阅读器使用。</p>
        </div>
      }
    >
      <DocumentRenderer workbook={createVirtualScrollWorkbook()} />
    </StoryShell>
  ),
};
