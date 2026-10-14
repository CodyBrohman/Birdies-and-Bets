# Website screenshots

These scripts make the phone screenshots on birdiesandbets.com: the hero, the "One hole at a time" story and the
screen tour. They use the app's own demo data (`src/store/demo.ts`), the same data as the App Store screenshots
(`scripts/screenshots.md`). The people and both clubs are made up.

1. Start the web build with demo data: `EXPO_PUBLIC_DEMO_DATA=1 npx expo start --web` (http://localhost:8081).
2. The first time on a machine, run `npm i --no-save playwright-core`. Then run `node scripts/website-shots/capture.js`.
   - It uses Edge; set `BROWSER` to point at another Chromium, or `APP_URL` for another port.
   - A fresh browser profile makes the app write the demo data.
   - The script photographs the round in progress, finishes it for Results, then photographs the other tabs.
   - It saves `raw/*.png` (402x778 @2x).
3. Run `python scripts/website-shots/frame.py` (needs Pillow). It adds the 9:41 status bar, the Dynamic Island, the
   home indicator and rounded corners, and writes 640x1391 PNGs to `framed/`.
4. Copy `framed/*.png` to `website/assets/img/` (`01-home.png` … `09-profile.png`). If a screen's content changed,
   update its `alt` text and caption in `website/index.html` too.
