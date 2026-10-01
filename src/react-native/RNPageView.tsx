/**
 * RN 文档渲染器 —— page 视图
 *
 * 复用 Web 同一套纯布局引擎 layoutPageView（自动分页 / 段表格列表跨页拆分 /
 * 页眉页脚 / 水印 / 浮动块定位），仅将 SVG 渲染层替换为 RN 原生组件：
 *  - 每页渲染为固定尺寸（pageSettings.width × height）的 View，块绝对定位；
 *  - 整页按可用宽度等比缩放（transform scale），保留 WYSIWYG 布局；
 *  - 页面 overflow hidden 裁剪，等价 Web SVG viewBox 视口。
 *
 * 数据变更（useWorkbookData）时自动重新布局，bind 内容实时刷新。
 */

import { useMemo, useState } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import type { PageViewDefinition } from "../core/types";
import { useWorkbookData } from "../react/DataProvider";
import { useWorkbookRuntime } from "../react/RuntimeProvider";
import type { PageTextDefaults } from "../renderers/page/pageDefaults";
import { layoutPageView, type PageLayoutPage } from "../renderers/page/pageLayout";
import { RNBlockRenderer } from "./RNBlockRenderer";

export interface RNPageViewProps {
  view: PageViewDefinition;
}

export interface RNPageProps {
  page: PageLayoutPage;
  scale: number;
  pageWidth: number;
  pageHeight: number;
  view: PageViewDefinition;
  textDefaults: PageTextDefaults;
}

function RNPage({ page, scale, pageWidth, pageHeight, view, textDefaults }: RNPageProps) {
  return (
    <View
      style={{
        width: pageWidth * scale,
        height: pageHeight * scale,
        marginBottom: 16,
        backgroundColor: "#ffffff",
        borderRadius: 4,
        shadowColor: "#000000",
        shadowOpacity: 0.1,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
      }}
    >
      <View
        style={{
          width: pageWidth,
          height: pageHeight,
          backgroundColor: "#ffffff",
          overflow: "hidden",
          transform: [{ scale }],
          transformOrigin: "top left",
        }}
      >
        {page.watermarkBlocks.map(({ block, x, y, width, height }, index) => (
          <RNBlockRenderer
            key={`watermark-${index}`}
            block={block}
            x={x}
            y={y}
            width={width}
            height={height}
            pageWidth={pageWidth}
            pageHeight={pageHeight}
            view={view}
            textDefaults={textDefaults}
          />
        ))}
        {page.headerBlocks.map(({ block, x, y, width, height }, index) => (
          <RNBlockRenderer
            key={`header-${index}`}
            block={block}
            x={x}
            y={y}
            width={width}
            height={height}
            pageWidth={pageWidth}
            pageHeight={pageHeight}
            view={view}
            textDefaults={textDefaults}
          />
        ))}
        {page.flowBlocks.map(({ block, x, y, width, height }, index) => (
          <RNBlockRenderer
            key={`flow-${index}`}
            block={block}
            x={x}
            y={y}
            width={width}
            height={height}
            pageWidth={pageWidth}
            pageHeight={pageHeight}
            view={view}
            textDefaults={textDefaults}
          />
        ))}
        {page.floatingBlocks.map(({ block, x, y, width, height }, index) => (
          <RNBlockRenderer
            key={`floating-${index}`}
            block={block}
            x={x}
            y={y}
            width={width}
            height={height}
            pageWidth={pageWidth}
            pageHeight={pageHeight}
            view={view}
            textDefaults={textDefaults}
          />
        ))}
        {page.footerBlocks.map(({ block, x, y, width, height }, index) => (
          <RNBlockRenderer
            key={`footer-${index}`}
            block={block}
            x={x}
            y={y}
            width={width}
            height={height}
            pageWidth={pageWidth}
            pageHeight={pageHeight}
            view={view}
            textDefaults={textDefaults}
          />
        ))}
      </View>
    </View>
  );
}

export function RNPageView({ view }: RNPageViewProps) {
  const { data } = useWorkbookData();
  const { registry, styleResolver } = useWorkbookRuntime();
  const { width: windowWidth } = useWindowDimensions();
  const [contentWidth, setContentWidth] = useState<number | undefined>();

  const layout = useMemo(
    () => layoutPageView(view, { data, registry, styleResolver }),
    [data, registry, styleResolver, view],
  );

  const pageWidth = view.pageSettings.width;
  const pageHeight = view.pageSettings.height;
  const scale = contentWidth != null ? contentWidth / pageWidth : (windowWidth - 32) / pageWidth;
  const textDefaults: PageTextDefaults = {
    fontFamily: view.pageSettings.defaultFontFamily,
    fontSize: view.pageSettings.defaultFontSize,
    lineHeight: view.pageSettings.defaultLineHeight,
    color: view.pageSettings.defaultColor,
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f3f4f6" }}
      contentContainerStyle={{ padding: 16, alignItems: "center" }}
    >
      <View style={{ width: "100%" }} onLayout={(event) => setContentWidth(event.nativeEvent.layout.width)}>
        {layout.pages.map((page) => (
          <RNPage
            key={page.pageIndex}
            page={page}
            scale={scale}
            pageWidth={pageWidth}
            pageHeight={pageHeight}
            view={view}
            textDefaults={textDefaults}
          />
        ))}
      </View>
    </ScrollView>
  );
}
