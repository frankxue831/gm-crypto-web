// Post-deploy live check: loads the live tool in zh and en, waits for the
// self-test badge, and requires class ok with "Self-test N/N" / "自检 N/N"
// (N = expected case count; the green state is a CSS dot, not a ✓) plus a
// footer commit equal to the deployed short SHA. Retries until DEADLINE_S
// to absorb GitHub Pages / CDN propagation.
const { chromium } = require('playwright-core');
const BASE = process.env.LIVE_URL || 'https://www.frankxue.dev/gm-crypto-web/';
const SHA = (process.env.EXPECTED_SHA || '').slice(0, 7);
const N = Number(process.env.EXPECTED_CASES || 11);
const DEADLINE = Date.now() + 1000 * Number(process.env.DEADLINE_S || 300);
if (!/^[0-9a-f]{7}$/.test(SHA)) { console.error('EXPECTED_SHA missing/invalid'); process.exit(2); }

async function checkOnce(browser, lang) {
  const page = await browser.newPage();
  try {
    const u = new URL(BASE); u.searchParams.set('lang', lang); u.searchParams.set('_lc', Date.now());
    const resp = await page.goto(u.href, { waitUntil: 'load', timeout: 30000 });
    if (!resp || resp.status() !== 200) return `HTTP ${resp && resp.status()}`;
    await page.waitForFunction(() => { const b = document.getElementById('stbadge'); return b && /^(ok|bad)$/.test(b.className); }, null, { timeout: 30000 });
    const badge = await page.$eval('#stbadge', b => ({ cls: b.className, text: b.textContent.trim() }));
    const commit = (await page.$eval('#commit', a => a.textContent.trim()));
    const errs = [];
    if (badge.cls !== 'ok' || !(badge.text === `Self-test ${N}/${N}` || badge.text === `自检 ${N}/${N}`)) errs.push(`badge "${badge.text}" (${badge.cls})`);
    if (commit !== SHA) errs.push(`footer commit ${commit} != ${SHA}`);
    console.log(`[${lang}] badge="${badge.text}" commit=${commit} ${errs.length ? 'FAIL' : 'OK'}`);
    return errs.join('; ') || null;
  } catch (e) { return String(e.message || e).split('\n')[0]; }
  finally { await page.close(); }
}

(async () => {
  const browser = await chromium.launch();
  let attempt = 0, last = {};
  for (;;) {
    attempt++;
    last = { zh: await checkOnce(browser, 'zh'), en: await checkOnce(browser, 'en') };
    if (!last.zh && !last.en) { console.log(`PASS on attempt ${attempt}: ${BASE} is ok ${N}/${N} at ${SHA} in zh+en`); break; }
    console.log(`attempt ${attempt}: zh=${last.zh || 'ok'} en=${last.en || 'ok'}`);
    if (Date.now() + 20000 > DEADLINE) { await browser.close(); console.error(`::error::live check failed after ${attempt} attempts: zh=${last.zh || 'ok'} en=${last.en || 'ok'}`); process.exit(1); }
    await new Promise(r => setTimeout(r, 20000));
  }
  await browser.close();
})();
