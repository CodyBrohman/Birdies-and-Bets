// Website screenshots, step 1: opens the local web build in headless Edge and saves raw 402x778 @2x captures to ./raw.
// The web build must run with the app's demo data: EXPO_PUBLIC_DEMO_DATA=1 npx expo start --web (src/store/demo.ts).
// A fresh browser profile has no saved data, so the app writes the demo on first load. Step 2: python frame.py.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const APP = process.env.APP_URL ?? 'http://localhost:8081';
const OUT = path.join(__dirname, 'raw');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 402, height: 778 }, deviceScaleFactor: 2, hasTouch: false });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));

  const pause = (ms = 600) => page.waitForTimeout(ms);
  const open = async (route) => {
    await page.goto(APP + route, { timeout: 240000 });
    await pause(3500);
  };
  const shot = async (name) => {
    await page.mouse.move(1, 1);
    await pause(900);
    await page.screenshot({ path: path.join(OUT, `${name}.png`) });
    console.log('shot', name);
  };
  const btn = (name) => page.getByRole('button', { name }).first();

  // The round in progress (demo: hole 17 at Heronmere) and its standings.
  await open('/');
  const seeded = await page.evaluate(() => localStorage.getItem('bb:round:active') != null);
  if (!seeded) throw new Error('No demo data: start the web build with EXPO_PUBLIC_DEMO_DATA=1, then run this again.');
  await shot('01-home');
  await open('/round/play');
  await shot('03-hole');
  await open('/round/standings');
  await shot('04-standings');

  // Hole 18, everyone par, then Results for the full round; Save round files it.
  await open('/round/play');
  await btn('Next hole').click();
  await pause();
  await btn(/^Everyone par/).click();
  await pause();
  await open('/round/summary');
  await shot('06-summary');
  await btn('Save round').click();
  await pause(1500);

  // The next round being set up, with no round in progress.
  await open('/play');
  await shot('02-new-round');

  // A finished round's page, scrolled to the paper scorecard.
  await open('/history/r_demo_1');
  await page.evaluate(() => {
    const header = [...document.querySelectorAll('[role="heading"]')].find((el) => el.textContent === 'Scorecard');
    header?.scrollIntoView({ block: 'start' });
  });
  await shot('05-card');

  await open('/courses');
  await shot('07-courses');
  await open('/friends');
  await shot('08-friends');
  await open('/profile');
  await shot('09-profile');

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
