import type { WorkbookDefinition } from "../../../src/schema/generated-types";

export const basicWorkbookFixture: WorkbookDefinition = {
  kind: "workbook",
  schemaVersion: "4.1.1",
  locale: "zh-CN",
  data: {
    customer: {
      name: "Alice",
    },
    items: [
      {
        name: "设备 A",
        qty: 2,
      },
    ],
  },
  views: [
    {
      type: "form",
      id: "editor",
      label: "编辑表单",
      config: {
        validateMode: "onChange",
        submitLabel: "保存",
        resetLabel: "重置",
      },
      fields: [
        {
          name: "customerName",
          type: "string",
          label: "客户姓名",
          bind: {
            path: "customer.name",
            mode: "twoWay",
          },
          validations: [
            {
              type: "required",
              message: "客户姓名不能为空",
            },
          ],
        },
      ],
      layout: [
        {
          type: "field",
          name: "customerName",
        },
      ],
    },
    {
      type: "page",
      id: "preview",
      label: "页面预览",
      pageSettings: {
        width: 595,
        height: 842,
      },
      content: [
        {
          type: "paragraph",
          runs: [
            {
              type: "text",
              text: "客户：",
            },
            {
              type: "text",
              bind: {
                path: "customer.name",
                mode: "oneWay",
              },
            },
          ],
        },
      ],
    },
    {
      type: "sheet",
      id: "sheet",
      name: "物料清单",
      label: "表格预览",
      columns: [{ width: 180 }, { width: 120 }],
      rowBind: {
        path: "items",
        rowTemplate: {
          cellMapping: {
            "0": {
              bind: {
                path: "items[*].name",
                mode: "oneWay",
              },
            },
            "1": {
              bind: {
                path: "items[*].qty",
                mode: "oneWay",
              },
            },
          },
        },
      },
    },
  ],
};
