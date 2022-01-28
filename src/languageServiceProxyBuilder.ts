type LanguageServiceProxy<T extends keyof ts.LanguageService> = (
  delegate: ts.LanguageService[T],
  info?: ts.server.PluginCreateInfo
) => ts.LanguageService[T];

interface LanguageServiceProxyWithIdentifier<
  T extends keyof ts.LanguageService
> {
  methodName: T;
  proxy: LanguageServiceProxy<T>;
}

export const languageServiceProxyBuilder = (
  info: ts.server.PluginCreateInfo,
  proxies: LanguageServiceProxyWithIdentifier<keyof ts.LanguageService>[] = []
) => {
  return {
    decorate: <
      T extends keyof ts.LanguageService,
      U extends LanguageServiceProxy<T>
    >(
      methodName: T,
      _proxy: U
    ) => {
      // @TODO: Maybe find a way to get rid of this cast
      const proxy: LanguageServiceProxy<any> = _proxy;

      proxies.push({ methodName, proxy });

      return languageServiceProxyBuilder(info, proxies);
    },
    build: () => {
      const languageService = info.languageService;

      for (const { methodName, proxy: _proxy } of proxies) {
        // @TODO: Maybe find a way to get rid of this cast
        const proxy: LanguageServiceProxy<any> = _proxy;

        // mutative
        languageService[methodName] = proxy(languageService[methodName], info);
      }

      return languageService;
    },
  };
};
