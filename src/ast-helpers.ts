import ts from "typescript";

export const findNodeAtPosition = (
  sourceFile: ts.SourceFile,
  position: number
) => {
  const find = (node: ts.Node) => {
    if (position >= node.getStart() && position < node.getEnd()) {
      return ts.forEachChild<ts.Node>(node, find) ?? node;
    }

    return;
  };

  return find(sourceFile);
};

export const findAllNodes = (
  sourceFile: ts.SourceFile,
  condition: (node: ts.Node) => boolean
) => {
  let nodes: ts.Node[] = [];

  const find = (node: ts.Node) => {
    if (ts.isArrayLiteralExpression(node)) {
      node.elements.forEach((expression) => {
        if (condition(expression)) {
          nodes.push(expression);
        }
      });
    } else if (condition(node)) {
      nodes.push(node);
    } else {
      ts.forEachChild(node, find);
    }
  };

  find(sourceFile);

  return nodes;
};

export const findCallExpressionWithIdentifierFromStringLiteral = (
  node: ts.StringLiteral,
  position: number,
  id: string
) => {
  const parent = node.parent;

  if (ts.isCallExpression(parent)) {
    const expression = parent.expression;

    if (!ts.isIdentifier(expression) || expression.getText() !== id) {
      return;
    }

    const start = node.getStart();
    const end = node.getEnd();

    if (position <= start || position >= end) {
      return;
    }
  } else if (ts.isArrayLiteralExpression(parent)) {
    const outer = parent.parent;

    if (!ts.isCallExpression(outer)) {
      return;
    }

    const expression = outer.expression;

    if (!ts.isIdentifier(expression) || expression.getText() !== id) {
      return;
    }

    const start = node.getStart();
    const end = node.getEnd();

    if (position <= start || position >= end) {
      return;
    }
  } else {
    return;
  }

  return node;
};
