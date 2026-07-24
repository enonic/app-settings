import { h, render } from 'preact';

import { App } from './app/App';

const container = document.getElementById('app');
if (container) {
  render(h(App, null), container);
}
