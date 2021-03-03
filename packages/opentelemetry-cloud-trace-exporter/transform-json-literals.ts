import {join, dirname} from 'path';
import * as ts from 'typescript';

export default function (program: ts.Program, pluginOptions: {}) {
  return (ctx: ts.TransformationContext) => {
    return (sourceFile: ts.SourceFile) => {
      function visitor(node: ts.Node): ts.Node {
        if (
          ts.isCallExpression(node) &&
          node.expression.getText() === 'jsonLiteral'
        ) {
          // path
          const filePathNode = node.arguments[0];
          const jsonPathNode = node.arguments[1];
          if (
            ts.isStringLiteralLike(filePathNode) &&
            ts.isStringLiteralLike(jsonPathNode)
          ) {
            const fileAbsPath = join(
              dirname(sourceFile.fileName),
              filePathNode.text
            );
            const jsonValue = require(fileAbsPath);
            const jsonObjPath = jsonPathNode.text.split('.');
            let res = jsonValue;
            jsonObjPath.forEach(pathPart => {
              res = res[pathPart];
            });
            return ts.createLiteral(res as string);
          } else {
            throw Error(
              'Arguments to jsonLiteral() must be string literal and function'
            );
          }
        }
        return ts.visitEachChild(node, visitor, ctx);
      }
      return ts.visitEachChild(sourceFile, visitor, ctx);
    };
  };
}
