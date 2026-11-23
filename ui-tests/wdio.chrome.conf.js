const fs = require('fs');
const path = require('path');
const { propertiesReader } = require('properties-reader');
const file = path.join(__dirname, './browser.properties');
const properties = propertiesReader({ sourceFile: file });
const browser_version = properties.get('browser.version');
const width = properties.get('browser.width');
const height = properties.get('browser.height');
const baseURL = properties.get('base.url');

exports.config = {
  specs: [path.join(__dirname, './specs/**/*.spec.js')],

  maxInstances: 1,

  strictSelectors: false,

  capabilities: [
    {
      browserName: 'chrome',
      ...(browser_version ? { browserVersion: String(browser_version) } : {}),
      'wdio:enforceWebDriverClassic': true,
      'goog:chromeOptions': {
        args: [
          '--headless',
          '--disable-gpu',
          '--no-sandbox',
          '--lang=en',
          '--disable-extensions',
          `--window-size=${width},${height}`,
        ],
      },
    },
  ],
  logLevel: 'info',
  //
  // Enables colors for log output.
  coloredLogs: true,

  baseUrl: baseURL,
  //
  // Default timeout for all waitForXXX commands.
  waitforTimeout: 3000,
  //
  // Default timeout in milliseconds for request
  // if Selenium Grid doesn't send response
  connectionRetryTimeout: 160000,
  //
  // Default request retries count
  connectionRetryCount: 3,

  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 120000,
  },
  outputDir: path.join(__dirname, './build/reports/logs'),

  reporters: [
    'concise',
    [
      'allure',
      {
        outputDir: './build/reports/allure',
        disableWebdriverStepsReporting: true,
        disableWebdriverScreenshotsReporting: true,
      },
    ],
  ],

  // Hook that gets executed before the suite starts
  beforeSuite: async function () {
    await browser.url(baseURL);
  },

  // A failed test leaves a screenshot of the page it failed on - an `assert` takes none by itself.
  // Named after the test, cut short: the titles are sentences.
  afterTest: async function (test, context, { passed }) {
    if (passed) {
      return;
    }
    const name = test.title
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80);
    const dir = path.join(__dirname, './build/reports/screenshots');
    try {
      fs.mkdirSync(dir, { recursive: true });
      await browser.saveScreenshot(path.join(dir, `failed_${name}_${Date.now()}.png`));
    } catch (err) {
      console.log('The screenshot of the failed test was not saved: ' + err);
    }
  },
};
