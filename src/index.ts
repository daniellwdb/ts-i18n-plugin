import type ts from "typescript/lib/tsserverlibrary";
import { createAnalysisContext } from "./createAnalysisContext";
import { createContext } from "./createContext";
import { getCompletionsAtPosition } from "./language-service-proxies/getCompletionsAtPosition";
import { getQuickInfoAtPosition } from "./language-service-proxies/getQuickInfoAtPosition";
import { getSemanticDiagnostics } from "./language-service-proxies/getSemanticDiagnostics";
import { languageServiceProxyBuilder } from "./languageServiceProxyBuilder";
import type { PluginCreateInfo } from "./types";

const create = (info: PluginCreateInfo) => {
  const logger = (message: string) => {
    return info.project.projectService.logger.info(
      `[ts-i18n-plugin]: ${message}`
    );
  };

  const analysisContext = createAnalysisContext(info, { logger });

  const withProxy = createContext(analysisContext);

  return languageServiceProxyBuilder(info)
    .decorate("getCompletionsAtPosition", withProxy(getCompletionsAtPosition))
    .decorate("getSemanticDiagnostics", withProxy(getSemanticDiagnostics))
    .decorate("getQuickInfoAtPosition", withProxy(getQuickInfoAtPosition))
    .build();
};

const pluginModuleFactory: ts.server.PluginModuleFactory = () => ({ create });

export = pluginModuleFactory;
