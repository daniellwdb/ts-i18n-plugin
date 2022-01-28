import path from "path";
import ts from "typescript";
import type { SymbolInformation } from "vscode-json-languageservice";
import type { AnalysisContext } from "../createAnalysisContext";
import type { GetCompletionsAtPosition } from "../createContext";
import { createJsonParser } from "../createJsonParser";

interface NamespaceSymbol {
  namespace: string;
  symbol: SymbolInformation;
}

export const getCompletionsAtPosition = (
  context: AnalysisContext,
  delegate: GetCompletionsAtPosition,
  fileName: string,
  position: number,
  options?: ts.GetCompletionsAtPositionOptions
) => {
  const prior = delegate(fileName, position, options);

  if (!context.isValidProject) {
    return prior;
  }

  const stringLiteralInInvokedCallExpression = context.findStringLiteralInInvokedCallExpression(
    fileName,
    position
  );

  if (stringLiteralInInvokedCallExpression) {
    const namespaces = context.getAllNamespaces();

    return <ts.CompletionInfo>{
      isGlobalCompletion: false,
      isMemberCompletion: false,
      isNewIdentifierLocation: false,
      entries: namespaces.map((name) => ({
        name,
        kind: ts.ScriptElementKind.string,
        kindModifiers: ts.ScriptElementKindModifier.ambientModifier,
        sortText: "0",
      })),
    };
  }

  const stringLiteralInInvokedBindingElement = context.findStringLiteralInInvokedBindingElement(
    fileName,
    position
  );

  if (stringLiteralInInvokedBindingElement) {
    const nodes = context.findAllStringLiteralsInInvokedCallExpression(
      fileName
    );

    const namespaces = [...new Set(nodes.map((node) => node.text))];

    if (!namespaces.length) {
      return prior;
    }

    if (namespaces.length === 1) {
      const pathToNamespace = context.getAbsolutePathForNamespace(
        namespaces[0]!
      );

      const jsonParser = createJsonParser(
        context.host,
        `${pathToNamespace}.json`
      );

      if (!jsonParser) {
        throw Error(`Could not create json parser for file ${pathToNamespace}`);
      }

      const symbols = jsonParser.getSymbols();

      return <ts.CompletionInfo>{
        isGlobalCompletion: false,
        isMemberCompletion: false,
        isNewIdentifierLocation: false,
        entries: symbols.map((symbol) => ({
          name: symbol.name,
          kind: ts.ScriptElementKind.string,
          kindModifiers: ts.ScriptElementKindModifier.ambientModifier,
          sortText: "0",
        })),
      };
    }

    const symbols = namespaces.reduce<NamespaceSymbol[]>((acc, namespace) => {
      const pathToNamespace = context.getAbsolutePathForNamespace(namespace);

      const jsonParser = createJsonParser(
        context.host,
        `${pathToNamespace}.json`
      );

      if (!jsonParser) {
        throw Error(`Could not create json parser for file ${pathToNamespace}`);
      }

      const file = path.parse(pathToNamespace);

      jsonParser
        .getSymbols()
        .forEach((symbol) => acc.push({ namespace: file.name, symbol }));

      return acc;
    }, []);

    return <ts.CompletionInfo>{
      isGlobalCompletion: false,
      isMemberCompletion: false,
      isNewIdentifierLocation: false,
      entries: symbols.map(({ namespace, symbol }) => ({
        name: `${namespace}:${symbol.name}`,
        kind: ts.ScriptElementKind.string,
        kindModifiers: ts.ScriptElementKindModifier.ambientModifier,
        sortText: "0",
      })),
    };
  }

  return prior;
};
