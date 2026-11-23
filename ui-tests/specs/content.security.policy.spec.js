const webDriverHelper = require('../libs/WebDriverHelper');
const settingsUtils = require('../libs/settings.utils');
const appConst = require('../libs/app_const');
const assert = require('node:assert');
const TestExtensionPage = require('../page_objects/test.extension.page');

describe('content.security.policy.spec - the Settings page is served with a Content-Security-Policy, and neither the shell nor a section it mounts violates it', function () {
  this.timeout(appConst.SUITE_TIMEOUT);
  if (typeof browser === 'undefined') {
    webDriverHelper.setupBrowser();
  }

  const SECTION = appConst.TEST_SECTIONS[0];
  // How Chrome words a violation in its log: "Refused to load the image '...' because it violates
  // the following Content Security Policy directive: ...".
  const VIOLATION = /Content Security Policy/i;
  // The sources the shell's baseline declares, per directive. A section may add sources of its own
  // to a directive, so each is looked for among the directive's sources, not compared with it.
  const BASELINE = {
    'default-src': "'none'",
    'base-uri': "'none'",
    'frame-ancestors': "'none'",
    'form-action': "'none'",
    'script-src': "'self'",
    'style-src': "'self'",
    'connect-src': "'self'",
    'font-src': "'self'",
  };

  // The violations logged since the last read, as their messages.
  async function readViolations() {
    const logs = await settingsUtils.getBrowserLogs();
    return logs.map((entry) => entry.message).filter((message) => VIOLATION.test(message));
  }

  it('GIVEN SU is logged in WHEN the Settings page has been requested THEN the response should carry the Content-Security-Policy baseline', async () => {
    await settingsUtils.navigateToSettingsApp();
    // 1. Read the header off the page's own url.
    const header = await settingsUtils.getBrowser().execute(async () => {
      const response = await fetch(location.href.split('#')[0], { credentials: 'same-origin' });
      return response.headers.get('content-security-policy');
    });
    assert.ok(header, 'The page should be served with a Content-Security-Policy header');
    // 2. Verify that every directive of the baseline is declared and names its source.
    const policy = new Map(
      header.split(';').map((directive) => {
        const [name, ...sources] = directive.trim().split(/\s+/);
        return [name, sources];
      }),
    );
    for (const [name, source] of Object.entries(BASELINE)) {
      assert.ok(policy.has(name), `'${name}' should be declared in the policy: ${header}`);
      assert.ok(
        policy.get(name).includes(source),
        `'${name}' should name ${source} in the policy: ${header}`,
      );
    }
    // 3. Nothing in the policy allows inline or evaluated code.
    assert.ok(!/unsafe-inline|unsafe-eval/.test(header), `No 'unsafe-*' source: ${header}`);
  });

  it('GIVEN SU is logged in WHEN the Settings page has been loaded anew at a section THEN no Content-Security-Policy violation should be logged', async () => {
    // 1. Start from an empty log.
    await settingsUtils.getBrowserLogs();
    // 2. Load the page cold at a test section: the shell's own assets, the import of the section's
    //    module and the request the section makes to its endpoint.
    await settingsUtils.openSettingsByHash(`#/${SECTION.path}`);
    await new TestExtensionPage(SECTION).waitForLoaded();
    assert.deepEqual(await readViolations(), [], 'Content-Security-Policy violations were logged');
  });

  // The control of the test above: with nothing logged it would pass just the same, so the policy
  // is shown to be enforced on this page and its violations to reach the log that test reads.
  it('GIVEN the Settings app is opened WHEN the page has requested an image from another origin THEN the request should be refused AND the violation should be logged', async () => {
    await settingsUtils.getBrowserLogs();
    // 1. An image from a host the policy does not name: refused before any request is made.
    await settingsUtils.getBrowser().execute(() => {
      const image = document.createElement('img');
      image.src = 'https://csp-control.invalid/pixel.png';
      document.body.appendChild(image);
      image.remove();
    });
    // 2. Verify that the violation is in the log.
    let violations = [];
    await settingsUtils.getBrowser().waitUntil(
      async () => {
        violations.push(...(await readViolations()));
        return violations.length > 0;
      },
      {
        timeout: appConst.TIMEOUT.MEDIUM,
        timeoutMsg: 'The refused image should be logged as a Content-Security-Policy violation',
      },
    );
    assert.ok(
      violations.some((message) => message.includes('csp-control.invalid')),
      `The violation should name the refused url: ${violations.join(' | ')}`,
    );
  });
});
