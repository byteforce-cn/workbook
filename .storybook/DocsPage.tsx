import { ArgTypes, Description, Primary, Stories, Subtitle, Title } from "@storybook/addon-docs/blocks";
import type { ReactNode } from "react";

/**
 * Docs page for the workbook stories.
 *
 * Differs from Storybook's default template in one way: the props table is
 * rendered `compact` (Name + Description only). Every prop of this library is a
 * schema object, callback or ref, so the Control/Default columns were a dead
 * "-" column on all 16 pages (issue #73 P1-1).
 */
export function DocsPage(): ReactNode {
  return (
    <>
      <Title />
      <Subtitle />
      <Description />
      <Primary />
      <ArgTypes compact />
      <Stories />
    </>
  );
}
