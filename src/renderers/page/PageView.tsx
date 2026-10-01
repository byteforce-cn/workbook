import { useMemo } from "react";
import { evaluateBooleanLike } from "../../core/condition/evaluate";
import type { PageViewDefinition } from "../../core/types";
import { useDevice } from "../../device/DeviceContext";
import { useWorkbookData } from "../../react/DataProvider";
import { useWorkbookRuntime } from "../../react/RuntimeProvider";
import { BlockRenderer } from "./BlockRenderer";
import type { PageTextDefaults } from "./pageDefaults";
import { layoutPageView } from "./pageLayout";

export interface PageViewProps {
  view: PageViewDefinition;
}

export function PageView({ view }: PageViewProps) {
  const { data } = useWorkbookData();
  const { registry, styleResolver } = useWorkbookRuntime();
  const { device } = useDevice();

  const layout = useMemo(
    () => layoutPageView(view, { data, registry, styleResolver }),
    [data, registry, styleResolver, view],
  );
  const pageWidth = view.pageSettings.width;
  const pageHeight = view.pageSettings.height;
  const textDefaults: PageTextDefaults = {
    fontFamily: view.pageSettings.defaultFontFamily,
    fontSize: view.pageSettings.defaultFontSize,
    lineHeight: view.pageSettings.defaultLineHeight,
    color: view.pageSettings.defaultColor,
  };

  return (
    <div className="bf-workbook-page-view" data-device={device}>
      {layout.pages.map((page) => {
        return (
          <svg
            key={page.pageIndex}
            width={pageWidth}
            height={pageHeight}
            viewBox={`0 0 ${pageWidth} ${pageHeight}`}
            data-workbook-page="true"
          >
            <title>{`Page ${page.pageIndex + 1}`}</title>
            <rect width={pageWidth} height={pageHeight} fill="#ffffff" stroke="#e5e7eb" />
            {page.watermarkBlocks.map(({ block, x, y, width, height }, index) => (
              <BlockRenderer
                key={`watermark-${index}`}
                block={block}
                x={x}
                y={y}
                width={width}
                height={height}
                pageWidth={pageWidth}
                pageHeight={pageHeight}
                textDefaults={textDefaults}
              />
            ))}
            {page.headerBlocks.map(({ block, x, y, width, height }, index) => (
              <BlockRenderer
                key={`header-${index}`}
                block={block}
                x={x}
                y={y}
                width={width}
                height={height}
                pageWidth={pageWidth}
                pageHeight={pageHeight}
                textDefaults={textDefaults}
              />
            ))}
            {page.flowBlocks.map(({ block, x, y, width, height }, index) => {
              if (!evaluateBooleanLike("visible" in block ? block.visible : undefined, data, registry, true)) {
                return null;
              }
              return (
                <BlockRenderer
                  key={`flow-${index}`}
                  block={block}
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  pageWidth={pageWidth}
                  pageHeight={pageHeight}
                  textDefaults={textDefaults}
                />
              );
            })}
            {page.floatingBlocks.map(({ block, x, y, width, height }, index) => (
              <BlockRenderer
                key={`floating-${index}`}
                block={block}
                x={x}
                y={y}
                width={width}
                height={height}
                pageWidth={pageWidth}
                pageHeight={pageHeight}
                textDefaults={textDefaults}
              />
            ))}
            {page.footerBlocks.map(({ block, x, y, width, height }, index) => (
              <BlockRenderer
                key={`footer-${index}`}
                block={block}
                x={x}
                y={y}
                width={width}
                height={height}
                pageWidth={pageWidth}
                pageHeight={pageHeight}
                textDefaults={textDefaults}
              />
            ))}
          </svg>
        );
      })}
    </div>
  );
}
