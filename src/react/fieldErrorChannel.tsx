/**
 * Field error channel between a host (e.g. a 409 from the server) and the
 * active form view.
 *
 * `DocumentRenderer` exposes the operations as an imperative handle; the form
 * view publishes a handler that merges the errors into its own state and moves
 * focus to the first affected field.
 */

import { createContext, useContext, useEffect } from "react";

export type FieldErrorInput = string | string[];

export interface FieldErrorChannel {
  setFieldErrors(fieldPath: string, message: FieldErrorInput): void;
  clearFieldErrors(fieldPath?: string): void;
}

export function createFieldErrorChannel(): FieldErrorChannel {
  return {
    setFieldErrors() {
      // Replaced by the mounted form view.
    },
    clearFieldErrors() {
      // Replaced by the mounted form view.
    },
  };
}

const FieldErrorContext = createContext<FieldErrorChannel | null>(null);

export const FieldErrorChannelProvider = FieldErrorContext.Provider;

export function useFieldErrorChannel(): FieldErrorChannel | null {
  return useContext(FieldErrorContext);
}

/** Publish the form view's field-error setters for the lifetime of the mount. */
export function useRegisterFieldErrorHandlers(
  setFieldErrors: (fieldPath: string, message: FieldErrorInput) => void,
  clearFieldErrors: (fieldPath?: string) => void,
): void {
  const channel = useFieldErrorChannel();

  useEffect(() => {
    if (channel == null) {
      return;
    }

    channel.setFieldErrors = setFieldErrors;
    channel.clearFieldErrors = clearFieldErrors;

    return () => {
      channel.setFieldErrors = () => undefined;
      channel.clearFieldErrors = () => undefined;
    };
  }, [channel, clearFieldErrors, setFieldErrors]);
}
