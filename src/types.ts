export interface PluginCreateInfo extends ts.server.PluginCreateInfo {
  config: {
    name: string;
    baseDir: string;
    primaryLocale?: string;
    callExpressionId?: string;
    bindingElementId?: string;
  };
}
