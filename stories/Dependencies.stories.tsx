import type { Meta, StoryObj } from "@storybook/react";

import { WorkbookStoryHarness } from "./WorkbookStoryHarness";
import { createDependencyCapabilityWorkbook } from "./workbookCapabilityFixtures";

const meta = {
  title: "Workbook/Dependencies",
  component: WorkbookStoryHarness,
  tags: ["autodocs"],
} satisfies Meta<typeof WorkbookStoryHarness>;

export default meta;

type Story = StoryObj<typeof meta>;

export const VisibilityAndDisableState: Story = {
  args: {
    testId: "workbook-story-dependencies",
    workbook: createDependencyCapabilityWorkbook(),
    caption: "通过字段依赖切换 disabled 与 visible，验证 dependency 引擎不是静态声明，而是直接驱动表单运行时状态。",
    width: "1080px",
  },
  render: (args) => <WorkbookStoryHarness {...args} />,
};
