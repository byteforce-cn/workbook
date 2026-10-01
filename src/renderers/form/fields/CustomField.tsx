import type { WorkbookFieldPluginProps } from "../../../core/types";
import { useWorkbookRuntime } from "../../../react/RuntimeProvider";

export interface CustomFieldProps extends WorkbookFieldPluginProps {
  componentName: string;
}

export function CustomField({ componentName, ...props }: CustomFieldProps) {
  const { registry } = useWorkbookRuntime();
  const Component = registry.field.get(componentName);

  if (Component == null) {
    return <div>未注册自定义字段：{componentName}</div>;
  }

  return <Component {...props} />;
}
