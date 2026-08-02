import { h, render } from 'preact';

import { App } from './app/App';
import { readConfig, setConfig } from './shared/config';
import { setPhrases } from './shared/i18n';

const container = document.getElementById('app');
if (container) {
  try {
    const config = readConfig();
    setConfig(config);
    setPhrases(config.phrases, config.locale);
    render(h(App, { config }), container);
  } catch (error) {
    console.error('Failed to start the Settings app:', error);
    container.textContent = 'The Settings app could not be started.';
  }
}
