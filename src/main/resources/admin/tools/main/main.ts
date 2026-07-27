import { render } from '/lib/mustache';
import { assetUrl } from '/lib/xp/portal';

export function get() {
  const view = resolve('./main.html');

  return {
    contentType: 'text/html',
    body: render(view, {
      mainJsUrl: assetUrl({ path: 'js/main.js' }),
      mainCssUrl: assetUrl({ path: 'css/main.css' }),
    }),
  };
}
