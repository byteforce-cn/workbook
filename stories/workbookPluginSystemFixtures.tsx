import type { LayoutNodeDefinition, WorkbookConditionDefinition, WorkbookLayoutPluginProps } from "../src/core/types";
import { createPluginRegistry } from "../src/react/registry";
import { validateWorkbookDocument } from "../src/schema";
import type { WorkbookDefinition } from "../src/schema/generated-types";
import { ShadcnStatusField } from "./workbookStoryRegistry";

function cloneWorkbook(workbook: WorkbookDefinition): WorkbookDefinition {
  return structuredClone(workbook);
}

function loadValidated(workbook: WorkbookDefinition): WorkbookDefinition {
  const validation = validateWorkbookDocument(workbook);
  if (!validation.valid) {
    throw new Error(`Invalid plugin story fixture: ${validation.errors.map((error) => error.message).join(", ")}`);
  }
  return cloneWorkbook(workbook);
}

/* ------------------------------------------------------------------ */
/* 1. Custom field plugin — StatusSegmented (shadcn 风格)               */
/* ------------------------------------------------------------------ */

export function createCustomFieldWorkbook(): WorkbookDefinition {
  return loadValidated({
    kind: "workbook",
    schemaVersion: "4.1.1",
    locale: "zh-CN",
    data: { projectStatus: "reviewing", owner: "李雷" },
    views: [
      {
        type: "form",
        id: "custom-field",
        label: "自定义字段插件",
        config: { validateMode: "onChange" },
        fields: [
          {
            name: "projectStatus",
            type: "custom",
            label: "项目状态",
            component: "shadcn/status-segmented",
            bind: { path: "projectStatus", mode: "twoWay" },
          },
          {
            name: "owner",
            type: "string",
            label: "负责人",
            bind: { path: "owner", mode: "twoWay" },
          },
        ],
        layout: [
          { type: "field", name: "projectStatus" },
          { type: "field", name: "owner" },
        ],
      },
    ],
  });
}

/* ------------------------------------------------------------------ */
/* 2. Custom layout plugin — Card                                      */
/* ------------------------------------------------------------------ */

function CardLayout({ node, children }: WorkbookLayoutPluginProps) {
  const customNode = node as LayoutNodeDefinition & { props?: { title?: unknown } };
  const title = typeof customNode.props?.title === "string" ? customNode.props.title : "卡片";
  return (
    <section
      data-testid="bf-card-layout"
      style={{
        border: "1px solid #bfdbfe",
        borderRadius: "12px",
        background: "linear-gradient(180deg, #eff6ff, #ffffff)",
        padding: "14px",
      }}
    >
      <h3 style={{ margin: "0 0 10px", fontSize: "14px", color: "#1d4ed8" }}>{title}</h3>
      {children}
    </section>
  );
}

export function createCustomLayoutWorkbook(): WorkbookDefinition {
  return loadValidated({
    kind: "workbook",
    schemaVersion: "4.1.1",
    locale: "zh-CN",
    data: { name: "交付计划", due: "2026-08-15", owner: "王芳" },
    views: [
      {
        type: "form",
        id: "custom-layout",
        label: "自定义布局插件",
        config: { validateMode: "onChange" },
        fields: [
          { name: "name", type: "string", label: "计划名称", bind: { path: "name", mode: "twoWay" } },
          { name: "due", type: "date", label: "截止日期", bind: { path: "due", mode: "twoWay" } },
          { name: "owner", type: "string", label: "负责人", bind: { path: "owner", mode: "twoWay" } },
        ],
        layout: [
          {
            type: "custom",
            component: "storybook/card",
            props: { title: "交付卡片" },
            children: [
              { type: "field", name: "name" },
              { type: "field", name: "due" },
              { type: "field", name: "owner" },
            ],
          } as LayoutNodeDefinition,
        ],
      },
    ],
  });
}

/* ------------------------------------------------------------------ */
/* 3. Custom validation plugin — ID card                               */
/* ------------------------------------------------------------------ */

const ID_CARD_RE = /^\d{17}[\dXx]$/;

function idCardValidation({ value }: { value: unknown }) {
  if (typeof value !== "string" || value === "") {
    return undefined;
  }
  if (!ID_CARD_RE.test(value)) {
    return "身份证号必须为 18 位（末位可为 X）";
  }
  // 简单加权校验（前 17 位权重）
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checkCodes = "10X98765432";
  let sum = 0;
  for (let index = 0; index < 17; index += 1) {
    sum += Number(value[index]) * weights[index];
  }
  const expected = checkCodes[sum % 11];
  return value[17].toUpperCase() === expected ? undefined : "身份证号校验位不正确";
}

export function createCustomValidationWorkbook(): WorkbookDefinition {
  return loadValidated({
    kind: "workbook",
    schemaVersion: "4.1.1",
    locale: "zh-CN",
    data: { idCard: "" },
    views: [
      {
        type: "form",
        id: "custom-validation",
        label: "自定义校验插件",
        config: { validateMode: "onChange" },
        fields: [
          {
            name: "idCard",
            type: "string",
            label: "身份证号",
            bind: { path: "idCard", mode: "twoWay" },
            validations: [{ type: "storybook/id-card", message: "身份证号不合法" }],
          },
        ],
        layout: [{ type: "field", name: "idCard" }],
      },
    ],
  });
}

/* ------------------------------------------------------------------ */
/* 4. Custom condition plugin — is workday                             */
/* ------------------------------------------------------------------ */

export function createCustomConditionWorkbook(): WorkbookDefinition {
  return loadValidated({
    kind: "workbook",
    schemaVersion: "4.1.1",
    locale: "zh-CN",
    data: { meetingDate: "2026-08-05", meetingRoom: "A301" },
    views: [
      {
        type: "form",
        id: "custom-condition",
        label: "自定义条件插件",
        config: { validateMode: "onChange" },
        fields: [
          {
            name: "meetingDate",
            type: "date",
            label: "会议日期",
            bind: { path: "meetingDate", mode: "twoWay" },
          },
          {
            name: "meetingRoom",
            type: "string",
            label: "会议室",
            bind: { path: "meetingRoom", mode: "twoWay" },
            visible: {
              op: "custom",
              name: "storybook/is-workday",
              params: { path: "meetingDate" },
            },
          },
        ],
        layout: [
          { type: "field", name: "meetingDate" },
          { type: "field", name: "meetingRoom" },
        ],
      },
    ],
  });
}

/* ------------------------------------------------------------------ */
/* Registry builder                                                    */
/* ------------------------------------------------------------------ */

function isWorkdayCondition({
  data,
  condition,
}: {
  data: Record<string, unknown>;
  condition: WorkbookConditionDefinition;
}) {
  const params = condition.params as { path?: unknown } | undefined;
  const path = typeof params?.path === "string" ? params.path : undefined;
  if (path == null) return true;
  const raw = data[path];
  if (typeof raw !== "string" || raw === "") return true;
  const [year, month, dayOfMonth] = raw.split("-").map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(dayOfMonth)) {
    return true;
  }
  // 用 UTC 构造日期避免本地时区偏移导致星期错位
  const day = new Date(Date.UTC(year, month - 1, dayOfMonth)).getUTCDay();
  return day >= 1 && day <= 5; // 周一 ~ 周五
}

export function createPluginSystemRegistry() {
  const registry = createPluginRegistry();

  registry.field.set("shadcn/status-segmented", ShadcnStatusField);
  registry.layout.set("storybook/card", CardLayout);
  registry.validation.set("storybook/id-card", idCardValidation);
  registry.condition.set("storybook/is-workday", isWorkdayCondition);

  return registry;
}
