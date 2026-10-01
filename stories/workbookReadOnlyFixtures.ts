import type { WorkbookDefinition } from "../src/schema/generated-types";

/**
 * 工程变更单工作簿 fixture —— 用于演示「审核中表单只读」。
 *
 * 以真实项目变更单为样张：基本信息 + 变更内容 + 影响金额 + 明细。
 * readOnly 通过 formView.config.readOnly 声明，无需逐个字段配 disabled。
 */
export function createChangeWorkbook({ readOnly }: { readOnly: boolean }): WorkbookDefinition {
  return {
    kind: "workbook",
    schemaVersion: "4.1.1",
    locale: "zh-CN",
    data: {
      docNo: "DOC-2026-001",
      docType: "项目变更",
      owner: "张三（项目经理）",
      createdAt: "2026-07-26 10:02",
      project: "跨海大桥工程 (P-2026-001)",
      amount: 5000000,
      duration: "+15 天",
      reason: "地质条件变更，原桩型承载力不足",
      before: "桩基采用旋挖钻孔灌注桩，桩径 φ1.2m，单桩承载力 8000kN。",
      after: "调整为 φ1.5m 大直径桩，单桩承载力提升至 12000kN，桩数由 48 根减至 36 根。",
      items: [
        { name: "旋挖钻孔灌注桩 φ1.5m", qty: 36, price: 125000, amount: 4500000 },
        { name: "混凝土 C35（桥梁）", qty: 320, price: 620, amount: 198400 },
      ],
    },
    views: [
      {
        type: "form",
        id: "change-form",
        label: readOnly ? "变更申请（审核中）" : "变更申请（草稿）",
        config: {
          readOnly,
          validateMode: "onBlur",
        },
        fields: [
          { name: "docNo", type: "string", label: "单据编号", bind: { path: "docNo", mode: "twoWay" } },
          { name: "docType", type: "string", label: "单据类型", bind: { path: "docType", mode: "twoWay" } },
          { name: "owner", type: "string", label: "发起人", bind: { path: "owner", mode: "twoWay" } },
          { name: "createdAt", type: "string", label: "创建时间", bind: { path: "createdAt", mode: "twoWay" } },
          { name: "project", type: "string", label: "关联项目", bind: { path: "project", mode: "twoWay" } },
          { name: "amount", type: "number", label: "影响金额", bind: { path: "amount", mode: "twoWay" } },
          { name: "duration", type: "string", label: "工期影响", bind: { path: "duration", mode: "twoWay" } },
          { name: "reason", type: "textarea", label: "变更原因", bind: { path: "reason", mode: "twoWay" } },
          { name: "before", type: "textarea", label: "变更前", bind: { path: "before", mode: "twoWay" } },
          { name: "after", type: "textarea", label: "变更后", bind: { path: "after", mode: "twoWay" } },
          {
            name: "items",
            type: "array",
            label: "明细",
            bind: { path: "items", mode: "twoWay" },
            arrayConfig: {
              itemFields: [
                { name: "name", type: "string" },
                { name: "qty", type: "number" },
                { name: "price", type: "number" },
                { name: "amount", type: "number" },
              ],
              addLabel: "新增明细",
              removeLabel: "删除明细",
            },
          },
          { name: "itemName", type: "string", label: "项目名称", bind: { path: "items[*].name", mode: "twoWay" } },
          { name: "itemQty", type: "number", label: "数量", bind: { path: "items[*].qty", mode: "twoWay" } },
          { name: "itemPrice", type: "number", label: "单价", bind: { path: "items[*].price", mode: "twoWay" } },
          { name: "itemAmount", type: "number", label: "金额", bind: { path: "items[*].amount", mode: "twoWay" } },
        ],
        layout: [
          {
            type: "group",
            title: "基本信息",
            children: [
              {
                type: "row",
                children: [
                  { type: "field", name: "docNo" },
                  { type: "field", name: "docType" },
                ],
              },
              {
                type: "row",
                children: [
                  { type: "field", name: "owner" },
                  { type: "field", name: "createdAt" },
                ],
              },
              {
                type: "row",
                children: [
                  { type: "field", name: "project" },
                  { type: "field", name: "amount" },
                ],
              },
              {
                type: "row",
                children: [
                  { type: "field", name: "duration" },
                  { type: "field", name: "reason" },
                ],
              },
            ],
          },
          {
            type: "group",
            title: "变更内容",
            children: [
              {
                type: "row",
                children: [
                  { type: "field", name: "before" },
                  { type: "field", name: "after" },
                ],
              },
            ],
          },
          {
            type: "group",
            title: "明细",
            children: [
              {
                type: "repeat",
                field: "items",
                children: [
                  {
                    type: "row",
                    children: [
                      { type: "field", name: "itemName" },
                      { type: "field", name: "itemQty" },
                      { type: "field", name: "itemPrice" },
                      { type: "field", name: "itemAmount" },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

/** 审核中只读版本（config.readOnly: true） */
export function createReadOnlyReviewWorkbook(): WorkbookDefinition {
  return createChangeWorkbook({ readOnly: true });
}

/** 可编辑草稿版本（无 readOnly）—— 与只读版对比 */
export function createEditableDraftWorkbook(): WorkbookDefinition {
  return createChangeWorkbook({ readOnly: false });
}
