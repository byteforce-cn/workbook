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
      {/* 默认模板会再渲染一次 primary story：`<Primary/>` 之后它仍在列表里（issue #73 P0-4）。 */}
      <Stories includePrimary={false} />
    </>
  );
}
