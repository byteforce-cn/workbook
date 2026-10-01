/**
 * Error Boundaries for @byteforce/workbook.
 *
 * Provides three levels of error containment:
 * 1. `WorkbookErrorBoundary` — top-level fatal error catcher with retry
 * 2. `FieldErrorBoundary` — per-field degradation (one bad field doesn't crash the form)
 * 3. `BlockErrorBoundary` — per-content-block degradation (one bad block doesn't crash the page)
 *
 * Design: React-specific (uses componentDidCatch / getDerivedStateFromError).
 */

import { Component, type ComponentType, type ErrorInfo, type ReactNode } from "react";

// ---- Severity ----

/** Error severity level for reporting */
export type ErrorSeverity = "fatal" | "error" | "warn" | "info";

// ---- WorkbookErrorBoundary ----

export interface WorkbookErrorBoundaryProps {
  children: ReactNode;
  /** Fallback UI. Receives `error` and `retry` function. */
  fallback: ReactNode | ComponentType<{ error: Error; retry: () => void }>;
  /** Error callback for reporting to external systems */
  onError?: (error: Error, severity: ErrorSeverity) => void;
  /** Severity level for error reporting (default: "error") */
  severity?: ErrorSeverity;
}

interface WorkbookErrorBoundaryState {
  error: Error | null;
}

/**
 * Top-level error boundary for workbook rendering.
 * Catches fatal errors and shows a fallback UI with retry capability.
 *
 * @example
 * ```tsx
 * <WorkbookErrorBoundary
 *   fallback={({ error, retry }) => (
 *     <div>渲染失败：{error.message} <button onClick={retry}>重试</button></div>
 *   )}
 *   onError={(error, severity) => reportError(error)}
 * >
 *   <DocumentRenderer workbook={workbook} />
 * </WorkbookErrorBoundary>
 * ```
 */
export class WorkbookErrorBoundary extends Component<WorkbookErrorBoundaryProps, WorkbookErrorBoundaryState> {
  constructor(props: WorkbookErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
    this.handleRetry = this.handleRetry.bind(this);
  }

  static getDerivedStateFromError(error: Error): WorkbookErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    const severity = this.props.severity ?? "error";
    this.props.onError?.(error, severity);
  }

  handleRetry(): void {
    this.setState({ error: null });
  }

  render(): ReactNode {
    if (this.state.error) {
      const { fallback } = this.props;
      if (typeof fallback === "function") {
        const FallbackComponent = fallback as ComponentType<{ error: Error; retry: () => void }>;
        return <FallbackComponent error={this.state.error} retry={this.handleRetry} />;
      }
      return fallback;
    }

    return this.props.children;
  }
}

// ---- FieldErrorBoundary ----

export interface FieldErrorBoundaryProps {
  children: ReactNode;
  /** Field path for error identification (e.g. "user.name") */
  fieldPath: string;
  /** Fallback UI for the errored field. Default: inline error placeholder. */
  fallback?: ReactNode;
  /** Callback when a field render error occurs */
  onFieldError?: (fieldPath: string, error: Error) => void;
}

interface FieldErrorBoundaryState {
  error: Error | null;
}

/**
 * Per-field error boundary.
 * If a single field component throws during render, only that field
 * is replaced with a fallback — the rest of the form continues to work.
 *
 * @example
 * ```tsx
 * <FieldErrorBoundary fieldPath="user.email" onFieldError={handleFieldError}>
 *   <EmailField />
 * </FieldErrorBoundary>
 * ```
 */
export class FieldErrorBoundary extends Component<FieldErrorBoundaryProps, FieldErrorBoundaryState> {
  constructor(props: FieldErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): FieldErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    this.props.onFieldError?.(this.props.fieldPath, error);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="bf-workbook-field-error-placeholder" role="alert" data-field-path={this.props.fieldPath}>
            ⚠️ Field render error
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// ---- BlockErrorBoundary ----

export interface BlockErrorBoundaryProps {
  children: ReactNode;
  /** Block type for error identification (e.g. "paragraph", "table") */
  blockType: string;
  /** Optional block ID for detailed tracking */
  blockId?: string;
  /** Fallback UI for the errored block. Default: inline error placeholder. */
  fallback?: ReactNode;
  /** Callback when a block render error occurs */
  onBlockError?: (blockType: string, blockId: string | undefined, error: Error) => void;
}

interface BlockErrorBoundaryState {
  error: Error | null;
}

/**
 * Per-content-block error boundary.
 * If a single content block (paragraph, table, image, etc.) throws
 * during render, only that block is replaced — the rest of the page
 * continues to render.
 *
 * @example
 * ```tsx
 * <BlockErrorBoundary blockType="table" blockId="t1" onBlockError={handleBlockError}>
 *   <TableRenderer />
 * </BlockErrorBoundary>
 * ```
 */
export class BlockErrorBoundary extends Component<BlockErrorBoundaryProps, BlockErrorBoundaryState> {
  constructor(props: BlockErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): BlockErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    this.props.onBlockError?.(this.props.blockType, this.props.blockId, error);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div
            className="bf-workbook-block-error-placeholder"
            role="alert"
            data-block-type={this.props.blockType}
            data-block-id={this.props.blockId}
          >
            ⚠️ Block render error ({this.props.blockType})
          </div>
        )
      );
    }

    return this.props.children;
  }
}
