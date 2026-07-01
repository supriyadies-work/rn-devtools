import type { HttpLogEntry } from "../core/types";

const shellEscape = (value: string) => value.replace(/'/g, `'\\''`);

export const toCurl = (entry: HttpLogEntry): string => {
  if (entry.phase !== "done") {
    return "";
  }

  const parts = [`curl -X ${entry.method} '${shellEscape(entry.url)}'`];

  if (entry.requestHeaders) {
    for (const [key, value] of Object.entries(entry.requestHeaders)) {
      parts.push(`-H '${shellEscape(`${key}: ${value}`)}'`);
    }
  }

  if (entry.requestBody !== undefined && entry.requestBody !== null) {
    const body =
      typeof entry.requestBody === "string"
        ? entry.requestBody
        : JSON.stringify(entry.requestBody);
    parts.push(`-d '${shellEscape(body)}'`);
  }

  return parts.join(" \\\n  ");
};
