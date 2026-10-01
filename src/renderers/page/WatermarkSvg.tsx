import type { PageBlockDefinition } from "../../core/types";
import { useWorkbookRuntime } from "../../react/RuntimeProvider";

export interface WatermarkSvgProps {
  block: Extract<PageBlockDefinition, { type: "watermark" }>;
  width: number;
  height: number;
}

export function WatermarkSvg({ block, width, height }: WatermarkSvgProps) {
  const { assetLoader } = useWorkbookRuntime();
  const watermarkSize = Math.max((block.fontSize ?? 48) * 2.5, 120);
  const horizontalStep = watermarkSize + 80;
  const verticalStep = watermarkSize + 80;
  const positions = block.repeat
    ? Array.from(
        { length: Math.max(1, Math.ceil(width / horizontalStep)) * Math.max(1, Math.ceil(height / verticalStep)) },
        (_, index) => {
          const columns = Math.max(1, Math.ceil(width / horizontalStep));
          const columnIndex = index % columns;
          const rowIndex = Math.floor(index / columns);

          return {
            x: horizontalStep / 2 + columnIndex * horizontalStep,
            y: verticalStep / 2 + rowIndex * verticalStep,
          };
        },
      )
    : [{ x: width / 2, y: height / 2 }];

  return (
    <g>
      {positions.map((position, index) => {
        const resolvedImage = block.image == null ? undefined : assetLoader.resolveAssetUrl(block.image);

        return (
          <g key={index} transform={`translate(${position.x}, ${position.y}) rotate(${block.rotation ?? -30})`}>
            {resolvedImage != null ? (
              <image
                href={resolvedImage}
                x={-watermarkSize / 2}
                y={-watermarkSize / 2}
                width={watermarkSize}
                height={watermarkSize}
                opacity={block.opacity ?? 0.25}
                preserveAspectRatio="xMidYMid meet"
              />
            ) : (
              <text
                textAnchor="middle"
                fill={block.color ?? "#9ca3af"}
                opacity={block.opacity ?? 0.25}
                fontSize={block.fontSize ?? 48}
              >
                {block.text}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}
