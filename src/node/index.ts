import glob from "glob";
import path from "path";
import { promisify } from "util";

const globAsync = promisify(glob);

const cache = new Map<string, Record<string, Record<string, string>>>();

let language: string;

const setLanguage = (lang: string) => (language = lang);

const interpolate = (translation: string, interpolation: object) => {
  return Object.entries(interpolation).reduce(
    (originalTranslation, [key, value]) => {
      const placeholder = `{{${key}}}`;
      const keyInTranslation = originalTranslation.includes(placeholder);

      if (keyInTranslation) {
        return originalTranslation.replace(placeholder, `${value}`);
      }

      return originalTranslation;
    },
    translation
  );
};

const loadI18nBundles = async (baseDir?: string) => {
  const isValidBaseDir = baseDir?.split(path.sep).pop() === "locales";

  if (!baseDir || !isValidBaseDir || !path.isAbsolute(baseDir)) {
    throw new Error(
      `Expected absolute path to locales folder, received: ${baseDir}`
    );
  }

  const files = await globAsync(`${baseDir}/**/*.json`);

  for (const file of files) {
    const { dir, name } = path.parse(file);
    const locale = dir.split(path.sep).pop();

    if (!locale) {
      throw new Error("No locale");
    }

    const json = await import(file);
    const prev = cache.get(locale);

    if (prev) {
      cache.set(locale, { ...prev, ...{ [name]: json.default } });
    } else {
      cache.set(locale, { [name]: json.default });
    }
  }
};

const useTranslation = (ns: string | string[]) => {
  if (!language) {
    throw new Error(
      "No language set, you can set a language by calling `setLanguage` before `useTranslation`"
    );
  }

  const resource = cache.get(language);

  if (!resource) {
    throw new Error(
      `Could not get resources for language ${language}, make sure to call \`loadI18nBundles\` before \`useTranslation\``
    );
  }

  const t = (key: string, interpolation?: object) => {
    let translation: string;

    if (!Array.isArray(ns)) {
      const match = resource[ns]?.[key];

      translation = match ?? key;
    } else {
      const [nsKey, nsValue] = key.split(":");

      if (!nsKey || !nsValue) {
        translation = key;
      } else {
        translation = resource[nsKey]?.[nsValue] ?? key;
      }
    }

    return interpolation
      ? interpolate(translation, interpolation)
      : translation;
  };

  return { t };
};

export { loadI18nBundles, setLanguage, useTranslation };
