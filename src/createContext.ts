import type { AnalysisContext } from "./createAnalysisContext";

export type GetCompletionsAtPosition = ts.LanguageService["getCompletionsAtPosition"];

export type GetSemanticDiagnostics = ts.LanguageService["getSemanticDiagnostics"];

export type GetQuickInfoAtPosition = ts.LanguageService["getQuickInfoAtPosition"];

type Delegate =
  | GetCompletionsAtPosition
  | GetSemanticDiagnostics
  | GetQuickInfoAtPosition;

export const createContext = (context: AnalysisContext) => <T extends Delegate>(
  languageServiceMethodProxy: (
    context: AnalysisContext,
    delegate: T,
    ...params: Parameters<T>
  ) => ReturnType<T>
) => (delegate: T) => (...params: Parameters<T>) => {
  return languageServiceMethodProxy(context, delegate, ...params);
};
