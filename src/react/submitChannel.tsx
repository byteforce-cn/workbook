/**
 * Submit channel between a host-driven action bar and the form view.
 *
 * `config.hideActions` lets a host render its own bottom bar, but the submit
 * itself still has to run workbook's pipeline (field validation → `onValidate`
 * hooks → `onSubmit` → save hooks). The active form view publishes its submit
 * handler here; `DocumentRenderer` exposes it as an imperative `submit()` handle.
 *
 * Deliberately internal: hosts use the `DocumentRenderer` ref, not this context.
 */

import { createContext, useContext, useEffect } from "react";

export interface SubmitChannel {
  /** Latest published handler, or null when no form view is mounted. */
  current: (() => Promise<boolean>) | null;
}

const SubmitChannelContext = createContext<SubmitChannel | null>(null);

export function createSubmitChannel(): SubmitChannel {
  return { current: null };
}

export const SubmitChannelProvider = SubmitChannelContext.Provider;

/** Read the channel (null outside a DocumentRenderer). */
export function useSubmitChannel(): SubmitChannel | null {
  return useContext(SubmitChannelContext);
}

/**
 * Publish the form view's submit handler.
 *
 * Runs after every render on purpose: the handler closes over the current data
 * tree, so the channel must always hold the latest one.
 */
export function useRegisterSubmitHandler(handler: (() => Promise<boolean>) | undefined): void {
  const channel = useSubmitChannel();

  useEffect(() => {
    if (channel == null) {
      return;
    }

    channel.current = handler ?? null;

    return () => {
      channel.current = null;
    };
  });
}
