import type { Meta, StoryObj } from "@storybook/react";

import { WorkbookStoryHarness } from "./WorkbookStoryHarness";
import { createLayoutCapabilityWorkbook, createRowSpanWorkbook } from "./workbookCapabilityFixtures";

const meta = {
  title: "Workbook/Layout",
  component: WorkbookStoryHarness,
  tags: ["autodocs"],
} satisfies Meta<typeof WorkbookStoryHarness>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TabsStepsRepeatAndHtml: Story = {
  args: {
    testId: "workbook-story-layout",
    workbook: createLayoutCapabilityWorkbook(),
    caption: "同一份 workbook 文档同时展示 group、row、tabs、steps、conditional、repeat 和 html 七类布局节点。",
  },
  render: (args) => <WorkbookStoryHarness {...args} />,
};

export const RowFieldSpan: Story = {
  args: {
    testId: "workbook-story-row-span",
    workbook: createRowSpanWorkbook(),
    caption: "row 布局消费 layoutField.span 相对跨列：1+1 等宽基线、1+2 与 2+1 错落、3 整行（textarea 宽字段跨列）。",
  },
  render: (args) => <WorkbookStoryHarness {...args} />,
};
