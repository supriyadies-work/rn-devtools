type Listener = () => void;

const listeners = new Set<Listener>();
let message: string | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

const DEFAULT_MESSAGE = "Disalin ke clipboard";
const TOAST_DURATION_MS = 1800;

const notify = () => {
  listeners.forEach((listener) => listener());
};

export const getClipboardToastMessage = (): string | null => message;

export const subscribeClipboardToast = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const showClipboardToast = (text = DEFAULT_MESSAGE) => {
  message = text;
  notify();

  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    message = null;
    hideTimer = null;
    notify();
  }, TOAST_DURATION_MS);
};
