import ts from "typescript";
import type { AnalysisContext } from "../createAnalysisContext";
import type { GetSemanticDiagnostics } from "../createContext";
import { createJsonParser } from "../createJsonParser";

const withQuote = (text: string) => `"${text}"`;

const createErrorDiagnostic = (
  messageText: string,
  file: ts.SourceFile,
  start: number,
  length: number
) => {
  return <ts.Diagnostic>{
    category: ts.DiagnosticCategory.Error,
    code: 0,
    messageText,
    file,
    start,
    length,
  };
};

export const getSemanticDiagnostics = (
  context: AnalysisContext,
  delegate: GetSemanticDiagnostics,
  fileName: string
) => {
  const prior = delegate(fileName) ?? [];
  const errors = [...prior];

  const namespaces = context.getAllNamespaces();

  const stringLiteralsInInvokedCallExpression = context.findAllStringLiteralsInInvokedCallExpression(
    fileName
  );

  const stringLiteralsInInvokedBindingElement = context.findAllStringLiteralsInInvokedBindingElement(
    fileName
  );

  const usedNamespaces = stringLiteralsInInvokedCallExpression
    .filter((node) => namespaces.includes(node.text))
    .map((node) => node.text);

  stringLiteralsInInvokedCallExpression.forEach((node) => {
    const file = node.getSourceFile();
    const start = node.getStart();
    const length = node.getWidth();

    if (!namespaces.includes(node.text)) {
      // const { t } = useTranslation("")
      // const { t } = useTranslation([""])
      errors.push(
        createErrorDiagnostic(
          `Invalid namespace ${
            node.text || '""'
          }, expected one of: ${namespaces.map(withQuote).join(" | ")}`,
          file,
          start,
          length
        )
      );
    }
  });

  stringLiteralsInInvokedBindingElement.forEach((node) => {
    const file = node.getSourceFile();
    const start = node.getStart();
    const length = node.getWidth();

    // const { t } = useTranslation("")
    // t("")
    if (!usedNamespaces.length) {
      return errors.push(
        createErrorDiagnostic(
          "Cannot invoke function without set namespace(s)",
          file,
          start,
          length
        )
      );
    }

    // const { t } = useTranslation("common")
    // t("")
    if (usedNamespaces.length === 1) {
      const pathToNamespace = context.getAbsolutePathForNamespace(
        usedNamespaces[0]!
      );

      const jsonParser = createJsonParser(
        context.host,
        `${pathToNamespace}.json`
      );

      if (!jsonParser) {
        throw Error(`Could not create json parser for file ${pathToNamespace}`);
      }

      const keys = jsonParser.getSymbols().map((symbol) => symbol.name);

      if (!keys.includes(node.text)) {
        return errors.push(
          createErrorDiagnostic(
            `Invalid key ${node.text || '""'}, expected one of: ${keys
              .map(withQuote)
              .join(" | ")}`,
            file,
            start,
            length
          )
        );
      }
    }

    if (usedNamespaces.length <= 1) {
      return;
    }

    // const { t } = useTranslation(["common", "greetings"])
    // t("")
    const [namespace, key] = node.text.split(":").filter(Boolean);

    if (!namespace) {
      return errors.push(
        createErrorDiagnostic(
          `Expected namespace, namespace must be one of: ${usedNamespaces
            .map(withQuote)
            .join(" | ")}`,
          file,
          start,
          length
        )
      );
    }

    // t("random")
    if (!usedNamespaces.includes(namespace)) {
      return errors.push(
        createErrorDiagnostic(
          `Invalid namespace ${namespace}, expected one of: ${usedNamespaces
            .map(withQuote)
            .join(" | ")}`,
          file,
          start + 1,
          namespace.length
        )
      );
    }

    const pathToNamespace = context.getAbsolutePathForNamespace(namespace);

    const jsonParser = createJsonParser(
      context.host,
      `${pathToNamespace}.json`
    );

    if (!jsonParser) {
      throw Error(`Could not create json parser for file ${pathToNamespace}`);
    }

    const keys = jsonParser.getSymbols().map((symbol) => symbol.name);

    // t("greetings")
    // t("greetings:random")
    if (!key || !keys.includes(key)) {
      return errors.push(
        createErrorDiagnostic(
          `Invalid key ${key || '""'}, expected one of: ${keys
            .map(withQuote)
            .join(" | ")}`,
          file,
          start + 1 + namespace.length + 1,
          key ? key.length : length
        )
      );
    }

    return;
  });

  return errors;
};
