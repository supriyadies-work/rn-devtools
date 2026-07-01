const isRouteGroup = (segment: string) =>
  segment.startsWith("(") && segment.endsWith(")");

export const segmentsToRouteFile = (segments: string[]): string => {
  if (segments.length === 0) {
    return "app/index.tsx";
  }

  const fileSegments = [...segments];
  const last = fileSegments[fileSegments.length - 1];

  if (last === "index") {
    fileSegments.pop();
    if (fileSegments.length === 0) {
      return "app/index.tsx";
    }
    return `app/${fileSegments.join("/")}/index.tsx`;
  }

  if (isRouteGroup(last)) {
    return `app/${fileSegments.join("/")}/index.tsx`;
  }

  return `app/${fileSegments.join("/")}.tsx`;
};
