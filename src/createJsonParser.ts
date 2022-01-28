import { getLanguageService, TextDocument } from "vscode-json-languageservice";
import { URI } from "vscode-uri";

export const createJsonParser = (
  host: ts.LanguageServiceHost,
  absoluteFilePath: string
) => {
  if (!host.readFile) {
    throw new Error("readFile not available");
  }

  const file = host.readFile(absoluteFilePath, "utf-8");

  if (!file) {
    return;
  }

  const uri = URI.file(absoluteFilePath);
  const textDocument = TextDocument.create(uri.toString(), "json", 1, file);
  const jsonLanguageService = getLanguageService({});
  const jsonDocument = jsonLanguageService.parseJSONDocument(textDocument);

  return {
    getSymbols: () => {
      return jsonLanguageService.findDocumentSymbols(
        textDocument,
        jsonDocument
      );
    },
  };
};
