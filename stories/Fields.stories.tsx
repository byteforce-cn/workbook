import type { Meta, StoryObj } from "@storybook/react";

import { WorkbookStoryHarness } from "./WorkbookStoryHarness";
import { createFieldsCapabilityWorkbook } from "./workbookCapabilityFixtures";

const meta = {
  title: "Workbook/Fields",
  component: WorkbookStoryHarness,
  tags: ["autodocs"],
} satisfies Meta<typeof WorkbookStoryHarness>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PrimitiveFieldTypes: Story = {
  args: {
    testId: "workbook-story-fields",
    workbook: createFieldsCapabilityWorkbook(),
    caption:
      "覆盖 string、number、boolean、date、textarea、select、multiselect、array、object 九类字段，并通过右侧数据树回显验证写回链路。",
  },
  render: (args) => <WorkbookStoryHarness {...args} />,
};
