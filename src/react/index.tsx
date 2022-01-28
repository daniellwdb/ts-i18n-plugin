import React from "react";

type WithChildren<T = {}> = T & {
  children: React.ReactNode | React.ReactNodeArray;
};

interface I18nContext {
  locale: string;
  resources: Record<string, Record<string, object>>;
}

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

const I18nContext = React.createContext<I18nContext | undefined>(undefined);

const I18nProvider = ({
  children,
  locale,
  resources,
}: WithChildren<I18nContext>) => {
  const memoizedContextValue = React.useMemo(() => ({ locale, resources }), [
    locale,
    resources,
  ]);

  return (
    <I18nContext.Provider value={memoizedContextValue}>
      {children}
    </I18nContext.Provider>
  );
};

const useTranslation = (ns: string | string[]) => {
  const context = React.useContext(I18nContext);

  if (!context) {
    throw new Error("useTranslation hook must be called within I18nProvider.");
  }

  const { locale, resources } = context;

  const t = React.useCallback(
    (key: string, interpolation?: object) => {
      let translation: string;

      if (!Array.isArray(ns)) {
        // @TODO: Fix TypeScript errors
        // @ts-expect-error
        const match = resources[locale][ns][key];

        translation = match ?? key;
      } else {
        const [nsKey, nsValue] = key.split(":");

        // @TODO: Fix TypeScript errors
        // @ts-expect-error
        translation = resources[locale][nsKey][nsValue];
      }

      return interpolation
        ? interpolate(translation, interpolation)
        : translation;
    },
    [ns, context]
  );

  return React.useMemo(() => ({ t, locale: context.locale }), [context, ns]);
};

const loadI18nBundle = async (
  baseDir: string,
  locale: string,
  namespaces: string[]
) => {
  const bundles = await Promise.all(
    namespaces.map(async (namespace) => {
      const json = await import(`${baseDir}/${locale}/${namespace}.json`);

      return [namespace, json.default];
    })
  );

  return { [locale]: Object.fromEntries(bundles) };
};

export { I18nProvider, useTranslation, loadI18nBundle };
