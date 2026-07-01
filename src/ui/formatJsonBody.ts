const TRUNCATED_SUFFIX = "…[truncated]";

const prettyJson = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const tryParseJson = (text: string): unknown | undefined => {
  const trimmed = text.trim();
  if (!trimmed) return undefined;

  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
};

export const formatJsonBody = (body: unknown): string => {
  if (body === undefined || body === null) return "(empty)";

  if (typeof body === "string") {
    const trimmed = body.trim();
    if (!trimmed) return "(empty)";

    const hasTruncated = trimmed.endsWith(TRUNCATED_SUFFIX);
    const jsonText = hasTruncated
      ? trimmed.slice(0, -TRUNCATED_SUFFIX.length).trimEnd()
      : trimmed;

    const parsed = tryParseJson(jsonText);
    if (parsed !== undefined) {
      return prettyJson(parsed) + (hasTruncated ? TRUNCATED_SUFFIX : "");
    }

    return body;
  }

  return prettyJson(body);
};
