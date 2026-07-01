export type DevToolsEnabledOptions = {
  isDev?: boolean;
  appVariant: "dev" | "prod";
};

export const resolveDevToolsEnabled = ({
  isDev = true,
  appVariant,
}: DevToolsEnabledOptions): boolean => isDev && appVariant === "dev";
