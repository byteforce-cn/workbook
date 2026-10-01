import type { Meta, StoryObj } from "@storybook/react";
import { type ReactNode, useState } from "react";

import { ResponsiveRenderer } from "../src/device/ResponsiveRenderer";
import type { DeviceMode, DeviceType } from "../src/device/types";
import type { WorkbookDefinition } from "../src/schema/generated-types";
import { StoryShell } from "./StoryShell";
import { createFrozenPanesWorkbook, createHeadersFootersWorkbook } from "./workbookPageSheetFixtures";

const meta = {
  title: "Workbook/Device",
  component: ResponsiveRenderer,
  tags: ["autodocs"],
} satisfies Meta<typeof ResponsiveRenderer>;

export default meta;

// Render-only demos, so keep args untyped.
type Story = StoryObj;

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

/** 多列表单：4 列 / 3 列 / 2 列 row，用于演示三端列数收敛。 */
function createResponsiveFormWorkbook(): WorkbookDefinition {
  return {
    kind: "workbook",
    schemaVersion: "4.1.1",
    locale: "zh-CN",
    data: {
      customer: {
        name: "华东能源集团",
        level: "重点客户",
        owner: "王敏",
        phone: "138-0000-0000",
        region: "华东",
        priority: "high",
        credit: 88,
        signedAt: "2026-05-12",
        expiryAt: "2027-05-11",
        remark: "季度续签客户，重点关注交付时效与打印质量。",
      },
    },
    views: [
      {
        type: "form",
        id: "responsive-form",
        label: "客户档案（多端适配）",
        config: { validateMode: "onBlur", submitLabel: "保存档案", resetLabel: "重置" },
        fields: [
          {
            name: "customerName",
            type: "string",
            label: "客户名称",
            bind: { path: "customer.name", mode: "twoWay" },
            validations: [{ type: "required", message: "客户名称不能为空" }],
          },
          {
            name: "level",
            type: "select",
            label: "客户等级",
            bind: { path: "customer.level", mode: "twoWay" },
            options: [
              { label: "重点客户", value: "重点客户" },
              { label: "普通客户", value: "普通客户" },
              { label: "潜在客户", value: "潜在客户" },
            ],
          },
          {
            name: "owner",
            type: "string",
            label: "客户经理",
            bind: { path: "customer.owner", mode: "twoWay" },
            validations: [{ type: "required", message: "客户经理不能为空" }],
          },
          {
            name: "phone",
            type: "string",
            label: "联系电话",
            bind: { path: "customer.phone", mode: "twoWay" },
            validations: [{ type: "required", message: "联系电话不能为空" }],
          },
          {
            name: "region",
            type: "select",
            label: "所属区域",
            bind: { path: "customer.region", mode: "twoWay" },
            options: [
              { label: "华东", value: "华东" },
              { label: "华北", value: "华北" },
              { label: "华南", value: "华南" },
              { label: "西南", value: "西南" },
            ],
          },
          {
            name: "priority",
            type: "select",
            label: "优先级",
            bind: { path: "customer.priority", mode: "twoWay" },
            options: [
              { label: "高", value: "high" },
              { label: "中", value: "medium" },
              { label: "低", value: "low" },
            ],
          },
          {
            name: "credit",
            type: "number",
            label: "信用评分",
            bind: { path: "customer.credit", mode: "twoWay" },
            validations: [
              { type: "min", params: 0, message: "评分不能为负" },
              { type: "max", params: 100, message: "评分不能超过 100" },
            ],
          },
          { name: "signedAt", type: "date", label: "签约日期", bind: { path: "customer.signedAt", mode: "twoWay" } },
          { name: "expiryAt", type: "date", label: "到期日期", bind: { path: "customer.expiryAt", mode: "twoWay" } },
          { name: "remark", type: "textarea", label: "备注", bind: { path: "customer.remark", mode: "twoWay" } },
        ],
        layout: [
          {
            type: "group",
            title: "基本信息",
            children: [
              {
                type: "row",
                gutter: 16,
                children: [
                  { type: "field", name: "customerName" },
                  { type: "field", name: "level" },
                  { type: "field", name: "owner" },
                  { type: "field", name: "phone" },
                ],
              },
              {
                type: "row",
                gutter: 16,
                children: [
                  { type: "field", name: "region" },
                  { type: "field", name: "priority" },
                  { type: "field", name: "credit" },
                ],
              },
              {
                type: "row",
                gutter: 16,
                children: [
                  { type: "field", name: "signedAt" },
                  { type: "field", name: "expiryAt" },
                ],
              },
            ],
          },
          {
            type: "group",
            title: "备注",
            children: [{ type: "field", name: "remark" }],
          },
        ],
      },
    ],
  };
}

/** 三视图套件：表单 + 分页文档 + Sheet 台账，用于 Auto 自适应演示。 */
function createResponsiveSuiteWorkbook(): WorkbookDefinition {
  const form = createResponsiveFormWorkbook();
  const page = createHeadersFootersWorkbook();
  const sheet = createFrozenPanesWorkbook();
  const pageView = page.views.find((view) => view.type === "page");
  const sheetView = sheet.views.find((view) => view.type === "sheet");

  if (pageView == null || sheetView == null) {
    throw new Error("Responsive suite is missing page/sheet views");
  }

  return {
    kind: "workbook",
    schemaVersion: "4.1.1",
    locale: "zh-CN",
    data: form.data,
    views: [form.views[0], pageView, sheetView],
  };
}

/* ------------------------------------------------------------------ */
/* Shared device-preview UI                                            */
/* ------------------------------------------------------------------ */

const DEVICE_OPTIONS: Array<{ value: DeviceMode; label: string }> = [
  { value: "desktop", label: "Desktop 桌面" },
  { value: "tablet", label: "Tablet 平板" },
  { value: "mobile", label: "Mobile 手机" },
  { value: "auto", label: "Auto 自适应" },
];

const DEVICE_FRAME_WIDTH: Record<DeviceType, string> = {
  mobile: "390px",
  tablet: "768px",
  desktop: "100%",
};

function DeviceSwitch({ value, onChange }: { value: DeviceMode; onChange: (next: DeviceMode) => void }) {
  return (
    <div
      data-testid="device-switch"
      role="group"
      aria-label="设备切换"
      style={{
        display: "flex",
        gap: "8px",
        flexWrap: "wrap",
        border: "1px solid #d7e0ea",
        borderRadius: "8px",
        background: "#f8fafc",
        padding: "10px 12px",
      }}
    >
      {DEVICE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          data-testid={`device-${option.value}`}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          style={{
            minHeight: "36px",
            border: value === option.value ? "1px solid #2563eb" : "1px solid #cbd5e1",
            borderRadius: "6px",
            background: value === option.value ? "#eff6ff" : "#ffffff",
            color: value === option.value ? "#1d4ed8" : "#172033",
            cursor: "pointer",
            font: "inherit",
            fontSize: "13px",
            fontWeight: 700,
            padding: "8px 12px",
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function DeviceFrame({ device, children }: { device: DeviceMode; children: ReactNode }) {
  if (device === "auto") {
    return <div data-testid="device-frame-auto">{children}</div>;
  }

  const width = DEVICE_FRAME_WIDTH[device];
  const framed = device !== "desktop";

  return (
    <div
      data-testid={`device-frame-${device}`}
      style={{
        width,
        maxWidth: "100%",
        margin: framed ? "0 auto" : 0,
        border: framed ? "1px solid #cbd5e1" : "none",
        borderRadius: framed ? "12px" : 0,
        background: "#ffffff",
        overflow: "hidden",
        minHeight: "120px",
      }}
    >
      {children}
    </div>
  );
}

function DevicePreview({
  testId,
  title,
  caption,
  capabilities,
  code,
  workbook,
  defaultDevice = "desktop",
}: {
  testId: string;
  title: string;
  caption: string;
  capabilities: string[];
  code: string;
  workbook: WorkbookDefinition;
  defaultDevice?: DeviceMode;
}) {
  const [device, setDevice] = useState<DeviceMode>(defaultDevice);

  return (
    <StoryShell
      testId={testId}
      title={title}
      caption={caption}
      capabilities={capabilities}
      code={code}
      inspector={
        <div style={{ display: "grid", gap: "8px", fontSize: "13px", color: "#526173", lineHeight: 1.6 }}>
          <p style={{ margin: 0 }}>
            当前设备：<code data-testid="current-device">{device}</code>
          </p>
          <p style={{ margin: 0 }}>断点：mobile &lt; 768px · tablet &lt; 1024px · desktop ≥ 1024px</p>
          <p style={{ margin: 0 }}>Auto 模式下请用 Storybook 工具栏的 viewport 预设（390 / 768 / 1280）验证。</p>
        </div>
      }
    >
      <div style={{ display: "grid", gap: "18px" }}>
        <DeviceSwitch value={device} onChange={setDevice} />
        <DeviceFrame device={device}>
          <ResponsiveRenderer workbook={workbook} device={device} />
        </DeviceFrame>
      </div>
    </StoryShell>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Responsive form                                                  */
/* ------------------------------------------------------------------ */

export const ResponsiveForm: Story = {
  render: () => (
    <DevicePreview
      testId="workbook-story-device-form"
      title="表单 · 三端适配"
      caption="同一份 schema 的多列 row 表单：Desktop 保持 4/3/2 列，Tablet 收敛为最多 2 列，Mobile 单列堆叠并启用 44px 触控目标与吸底操作栏。"
      capabilities={["Desktop", "Tablet", "Mobile", "row 收敛", "触控目标", "吸底操作栏"]}
      workbook={createResponsiveFormWorkbook()}
      code={`// 一行切换目标设备，同一份 workbook schema 无需改动
import { ResponsiveRenderer } from "@byteforce/workbook";

<ResponsiveRenderer
  workbook={customerFormWorkbook}
  device="mobile"          // "desktop" | "tablet" | "mobile" | "auto"
/>

// 等价于三端专用渲染器：
// <WorkbookDesktopRenderer ... />  <WorkbookTabletRenderer ... />  <WorkbookMobileRenderer ... />`}
    />
  ),
};

/* ------------------------------------------------------------------ */
/* 2. Responsive page                                                  */
/* ------------------------------------------------------------------ */

export const ResponsivePage: Story = {
  render: () => (
    <DevicePreview
      testId="workbook-story-device-page"
      title="分页文档 · 三端适配"
      caption="A4 分页文档在容器内等比缩放：桌面完整尺寸、平板/手机缩放到容器宽度，页眉页脚与水印随页面整体缩放。"
      capabilities={["Desktop", "Tablet", "Mobile", "等比缩放", "分页"]}
      workbook={createHeadersFootersWorkbook()}
      defaultDevice="auto"
      code={`// Page 视图的 SVG 页面本身按 viewBox 等比缩放（max-width: 100%）
<ResponsiveRenderer workbook={headersFootersWorkbook} device="auto" />

// 三端共用同一分页引擎，仅呈现尺寸不同`}
    />
  ),
};

/* ------------------------------------------------------------------ */
/* 3. Responsive sheet                                                 */
/* ------------------------------------------------------------------ */

export const ResponsiveSheet: Story = {
  render: () => (
    <DevicePreview
      testId="workbook-story-device-sheet"
      title="Sheet 台账 · 三端适配"
      caption="冻结窗格台账：桌面展示完整四窗格，平板/手机视口宽度收窄并启用横向滚动，冻结列保持可见。"
      capabilities={["Desktop", "Tablet", "Mobile", "冻结窗格", "横向滚动"]}
      workbook={createFrozenPanesWorkbook()}
      defaultDevice="auto"
      code={`// Sheet 视口按容器宽度自适应（含滚动条预留），三端无需业务代码
<ResponsiveRenderer workbook={frozenPanesWorkbook} device="auto" />`}
    />
  ),
};

/* ------------------------------------------------------------------ */
/* 4. Auto-detect suite                                                */
/* ------------------------------------------------------------------ */

export const AutoDetect: Story = {
  render: () => (
    <DevicePreview
      testId="workbook-story-device-auto"
      title="Auto 自适应 · 三视图套件"
      caption="表单 + 分页文档 + Sheet 台账在同一容器中按视口宽度自动切换设备。用 Storybook 工具栏的 viewport 预设切换 390 / 768 / 1280 验证三端表现。"
      capabilities={["Auto 检测", "表单", "分页文档", "Sheet 台账", "viewport"]}
      workbook={createResponsiveSuiteWorkbook()}
      defaultDevice="auto"
      code={`// device="auto"：按视口宽度自动检测
//   < 768px  → mobile · < 1024px → tablet · ≥ 1024px → desktop
<ResponsiveRenderer
  workbook={suiteWorkbook}
  device="auto"
  breakpoints={{ mobile: 768, tablet: 1024 }}  // 可选自定义
/>`}
    />
  ),
};
