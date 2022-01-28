import path from "path";
import ts from "typescript";
import {
  findAllNodes,
  findCallExpressionWithIdentifierFromStringLiteral,
  findNodeAtPosition,
} from "./ast-helpers";
import type { PluginCreateInfo } from "./types";

export type AnalysisContext = ReturnType<typeof createAnalysisContext>;

interface AnalysisContextOptions {
  logger: (message: string) => void;
}

const getAbsolutePath = (root: string, baseDir: string) => {
  if (path.isAbsolute(baseDir)) {
    return baseDir;
  }

  return path.resolve(root, baseDir);
};

export const createAnalysisContext = (
  info: PluginCreateInfo,
  { logger }: AnalysisContextOptions
) => {
  const getSourceFile = (fileName: string) => {
    const program = info.languageService.getProgram();

    if (!program) {
      throw new Error("Language service does not have a program");
    }

    const sourceFile = program.getSourceFile(fileName);

    if (!sourceFile) {
      throw new Error(`${fileName} is not a source file`);
    }

    return sourceFile;
  };

  const projectName = info.project.getProjectName();

  const baseDir = getAbsolutePath(
    path.dirname(projectName),
    info.config.baseDir
  );

  const baseDirExists = info.serverHost.directoryExists(baseDir);
  const isValidBaseDir = baseDir.split(path.sep).pop() === "locales";
  const callExpressionId = info.config.callExpressionId ?? "useTranslation";
  const bindingElementId = info.config.bindingElementId ?? "t";

  return {
    isValidProject: baseDirExists && isValidBaseDir,
    logger,
    host: info.languageServiceHost,
    getAbsolutePathForNamespace: (namespace: string) => {
      const primaryLocale = info.config.primaryLocale;

      if (primaryLocale) {
        return path.join(baseDir, primaryLocale, namespace);
      }

      const [firstLocale] = info.serverHost.getDirectories(baseDir);

      return path.join(baseDir, firstLocale!, namespace);
    },
    getAllNamespaces: () => {
      const locales = info.serverHost.getDirectories(baseDir);
      const uniqueNamespaces = new Set<string>();

      for (const locale of locales) {
        const namespaces = info.serverHost.readDirectory(
          path.join(baseDir, locale)
        );

        for (const namespace of namespaces) {
          const file = path.parse(namespace);

          if (file.ext === ".json") {
            uniqueNamespaces.add(file.name);
          }
        }
      }

      return [...uniqueNamespaces];
    },
    findStringLiteralInInvokedCallExpression: (
      fileName: string,
      position: number
    ) => {
      // Attempt to find node with a string inside invoked call expression:
      // useTranslation("")
      // useTranslation([""])

      const sourceFile = getSourceFile(fileName);
      const node = findNodeAtPosition(sourceFile, position);

      if (!node || !ts.isStringLiteral(node)) {
        return;
      }

      const stringLiteralInCallExpression = findCallExpressionWithIdentifierFromStringLiteral(
        node,
        position,
        callExpressionId
      );

      return stringLiteralInCallExpression;
    },
    findStringLiteralInInvokedBindingElement: (
      fileName: string,
      position: number
    ) => {
      // Attempt to find node with a string inside invoked binding element:
      // const { t } = useTranslation("")
      // t("")

      const sourceFile = getSourceFile(fileName);
      const node = findNodeAtPosition(sourceFile, position);

      if (!node || !ts.isStringLiteral(node)) {
        return;
      }

      const stringLiteralInCallExpression = findCallExpressionWithIdentifierFromStringLiteral(
        node,
        position,
        bindingElementId
      );

      return stringLiteralInCallExpression;
    },
    findAllStringLiteralsInInvokedCallExpression: (fileName: string) => {
      const sourceFile = getSourceFile(fileName);

      const allStringLiterals = findAllNodes(sourceFile, (node) =>
        ts.isStringLiteral(node)
      );

      const nodes = allStringLiterals.filter((node) => {
        const parent = node.parent;

        if (ts.isCallExpression(parent)) {
          const expression = parent.expression;

          if (
            !ts.isIdentifier(expression) ||
            expression.getText() !== callExpressionId
          ) {
            return false;
          }
        } else if (ts.isArrayLiteralExpression(parent)) {
          const outer = parent.parent;

          if (!ts.isCallExpression(outer)) {
            return false;
          }

          const expression = outer.expression;

          if (
            !ts.isIdentifier(expression) ||
            expression.getText() !== callExpressionId
          ) {
            return false;
          }
        } else {
          return false;
        }

        return true;
      });

      return nodes as ts.StringLiteral[];
    },
    findAllStringLiteralsInInvokedBindingElement: (fileName: string) => {
      const sourceFile = getSourceFile(fileName);

      const allStringLiterals = findAllNodes(sourceFile, (node) =>
        ts.isStringLiteral(node)
      );

      const nodes = allStringLiterals.filter((node) => {
        const parent = node.parent;

        if (!ts.isCallExpression(parent)) {
          return false;
        }

        const expression = parent.expression;

        if (!ts.isIdentifier(expression)) {
          return false;
        }

        return expression.text === bindingElementId;
      });

      return nodes as ts.StringLiteral[];
    },
  };
};
