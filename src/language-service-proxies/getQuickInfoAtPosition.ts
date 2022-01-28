import ts from "typescript";
import type { AnalysisContext } from "../createAnalysisContext";
import type { GetQuickInfoAtPosition } from "../createContext";

export const getQuickInfoAtPosition = (
  context: AnalysisContext,
  delegate: GetQuickInfoAtPosition,
  fileName: string,
  position: number
) => {
  const prior = delegate(fileName, position);

  if (!context.isValidProject) {
    return prior;
  }

  const node = context.findStringLiteralInInvokedCallExpression(
    fileName,
    position
  );

  if (!node) {
    return prior;
  }

  const namespaces = context.getAllNamespaces();

  return <ts.QuickInfo>{
    kind: ts.ScriptElementKind.string,
    kindModifiers: ts.ScriptElementKindModifier.none,
    textSpan: {
      start: position,
      length: 1,
    },
    displayParts: [
      {
        text: `(i18n namespace) ${namespaces
          .map((namespace) => `"${namespace}"`)
          .join(" | ")}`,
        kind: ts.ScriptElementKindModifier.none,
      },
    ],
  };
};
