import { showClipboardToast } from "./clipboardToast";

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    const Clipboard = await import("expo-clipboard");
    await Clipboard.setStringAsync(text);
    showClipboardToast();
    return true;
  } catch {
    return false;
  }
};
