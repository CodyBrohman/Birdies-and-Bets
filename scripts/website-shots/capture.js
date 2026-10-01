// Website screenshots, step 1: drives the local web build (npx expo start --web) in headless Edge with demo data
// and saves raw 402x778 @2x captures to ./raw. Step 2: python frame.py. See README.md.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const APP = 'http://localhost:8081';
const OUT = path.join(__dirname, 'raw');
fs.mkdirSync(OUT, { recursive: true });
const course = JSON.parse(fs.readFileSync(path.join(__dirname, '../../assets/courses/cedar-ridge.json'), 'utf8'));

const now = new Date();
const iso = (daysAgo) => new Date(now.getTime() - daysAgo * 864e5).toISOString();
const profile = (id, name, index, played, prevIndex) => ({
  id,
  name,
  handicapIndex: index,
  indexHistory: [...(prevIndex != null ? [{ at: iso(40), index: prevIndex }] : []), { at: iso(30), index }],
  createdAt: iso(40),
  ...(played != null ? { lastPlayedAt: iso(played) } : {}),
});
const copyCourse = (id, name, location) => ({ ...course, id, name, location, userEntered: true, source: 'user' });

const seed = {
  'bb:schema': 3,
  'bb:preferences': { haptics: true, defaultStakeLabel: 'points', defaultAllowance: 100, onboarded: true, meProfileId: 'pr_alex', homeArea: 'Toronto, ON', bag: ['driver', '3w', '5w', '5i', '6i', '7i', '8i', '9i', 'pw', 'sw', 'putter'] },
  'bb:players:profiles': [
    profile('pr_alex', 'Alex Morgan', 14.2, null, 14.9),
    profile('pr_maya', 'Maya Chen', 11.2, 9),
    profile('pr_jordan', 'Jordan Lee', 18.4, 16),
    profile('pr_sam', 'Sam Rivera', 7.8, null),
    profile('pr_alexis', 'Alexis Park', 22.0, null),
  ],
  'bb:players:groups': [{ id: 'grp_sat', name: 'Saturday crew', memberIds: ['pr_alex', 'pr_maya', 'pr_jordan', 'pr_sam'] }],
  'bb:courses:user': [copyCourse('harbour-pines', 'Harbour Pines Golf Club', 'Oakville, ON'), copyCourse('maple-hollow', 'Maple Hollow Golf Club', 'Caledon, ON')],
  'bb:courses:recent': [],
  'bb:theme:preference': 'light',
};

// Strokes over par per hole for Alex, Maya, Jordan, Sam (a believable spread with a few birdies).
const DIFFS = [
  [1, 0, 2, -1], [0, 1, 1, 0], [2, 0, 1, 0], [0, -1, 2, 1], [1, 1, 0, 0], [-1, 0, 1, 0],
  [1, 2, 1, 0], [0, 0, 2, -1], [2, 1, 1, 1], [1, 0, 0, 0], [0, 1, 3, 0], [1, 0, 1, 1],
  [0, 1, 1, 0], [2, 0, 2, 0], [1, -1, 1, 1], [0, 1, 0, -1], [1, 0, 2, 0], [0, 1, 1, 1],
];
const NAMES = ['Alex Morgan', 'Maya Chen', 'Jordan Lee', 'Sam Rivera'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayAfterTomorrow = WEEKDAYS[new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2).getDay()];

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 402, height: 778 }, deviceScaleFactor: 2, hasTouch: false });
  await ctx.addInitScript((data) => {
    if (localStorage.getItem('bb:seeded')) return;
    for (const [k, v] of Object.entries(data)) localStorage.setItem(k, JSON.stringify(v));
    localStorage.setItem('bb:seeded', '1');
  }, seed);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));

  const btn = (name) => page.getByRole('button', { name, exact: typeof name === 'string' }).first();
  const tab = (name) => page.getByRole('tab', { name, exact: true }).first();
  const pause = (ms = 500) => page.waitForTimeout(ms);
  const shot = async (name) => {
    await page.mouse.move(1, 1);
    await pause(900);
    await page.screenshot({ path: path.join(OUT, `${name}.png`) });
    console.log('shot', name);
  };
  const scrollTop = () => page.evaluate(() => document.querySelectorAll('div').forEach((d) => d.scrollHeight > d.clientHeight + 4 && (d.scrollTop = 0)));

  const setUpRound = async (courseName, games) => {
    await tab('Courses').click();
    await pause();
    await btn(new RegExp('^' + courseName + '\\.')).click();
    await pause(800);
    for (const n of NAMES.slice(1)) await btn(`Add ${n}`).click();
    for (const g of games) await btn(`Add ${g}`).click();
    await btn(dayAfterTomorrow).click();
    await pause();
  };

  const scoreHoles = async (from, to) => {
    for (let h = from; h <= to; h++) {
      const par = course.holes[h - 1].par;
      for (let i = 0; i < 4; i++) await btn(new RegExp(`^${NAMES[i]}: ${par + DIFFS[h - 1][i]},`)).click();
      await pause(700);
    }
  };

  await page.goto(APP + '/');
  await pause(4000);

  // Round 1: a finished round so Home and Friends have history.
  await tab('Bet').click();
  await pause();
  await setUpRound('Harbour Pines Golf Club', ['Skins', 'Stableford']);
  await btn('Start this round').click();
  await pause(1200);
  await scoreHoles(1, 18);
  await pause(1200);
  await shot('summary');
  await btn('Done').click();
  await pause(1500);

  // Round 2: set up, then photograph the tabs with a round on deck.
  await page.goto(APP + '/bet');
  await pause(2500);
  await setUpRound('Cedar Ridge Golf Club', ['Skins', 'Hot Seat']);
  await scrollTop();
  await shot('bet');
  await tab('Home').click();
  await scrollTop();
  await shot('home');
  await tab('Courses').click();
  await scrollTop();
  await shot('courses');
  await tab('Friends').click();
  await scrollTop();
  await shot('friends');
  await tab('Profile').click();
  await scrollTop();
  await shot('profile');

  // Play six holes of round 2 and photograph the round screens.
  await tab('Bet').click();
  await pause();
  await btn('Start this round').click();
  await pause(1200);
  await scoreHoles(1, 6);
  await scrollTop();
  await shot('hole');
  await tab('Games').click();
  await scrollTop();
  await shot('standings');
  await tab('Card').click();
  await shot('card');

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
