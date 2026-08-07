"use client";

import * as React from "react";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 5000;

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

type State = {
  toasts: ToasterToast[];
};

let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
const listeners: Array<(state: State) => void> = [];
let memoryState: State = { toasts: [] };

function dispatch(action: { type: "ADD" | "REMOVE"; toast?: ToasterToast; toastId?: string }) {
  if (action.type === "ADD" && action.toast) {
    memoryState = {
      ...memoryState,
      toasts: [action.toast, ...memoryState.toasts].slice(0, TOAST_LIMIT),
    };
    const timeout = setTimeout(() => {
      dispatch({ type: "REMOVE", toastId: action.toast!.id });
    }, TOAST_REMOVE_DELAY);
    toastTimeouts.set(action.toast.id, timeout);
  } else if (action.type === "REMOVE") {
    memoryState = {
      ...memoryState,
      toasts: memoryState.toasts.filter((t) => t.id !== action.toastId),
    };
    const timeout = toastTimeouts.get(action.toastId!);
    if (timeout) clearTimeout(timeout);
    toastTimeouts.delete(action.toastId!);
  }
  listeners.forEach((l) => l(memoryState));
}

function toast({ ...props }: Omit<ToasterToast, "id">) {
  const id = genId();
  dispatch({ type: "ADD", toast: { id, ...props } });
  return { id, dismiss: () => dispatch({ type: "REMOVE", toastId: id }) };
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState);
  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);
  return { ...state, toast };
}

export { useToast, toast };
