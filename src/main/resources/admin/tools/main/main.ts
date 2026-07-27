import { CONFIG_SCRIPT_ID, getConfig, serializeConfig } from '/lib/config';
import { resolveLocales } from '/lib/i18n';
import { render } from '/lib/mustache';
import { assetUrl } from '/lib/xp/portal';

type Request = {
  locales?: string[];
};

export function get(request: Request) {
  const view = resolve('./main.html');
  const config = getConfig(resolveLocales(request.locales));

  return {
    contentType: 'text/html',
    body: render(view, {
      assetsUrl: config.assetsUrl,
      mainJsUrl: assetUrl({ path: 'js/main.js' }),
      mainCssUrl: assetUrl({ path: 'css/main.css' }),
      fontUrl: assetUrl({ path: 'fonts/OpenSans.woff2' }),
      configScriptId: CONFIG_SCRIPT_ID,
      configAsJson: serializeConfig(config),
    }),
  };
}
