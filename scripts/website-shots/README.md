# Website screenshots

These scripts make the phone screenshots on birdiesandbets.com (the hero and the "One hole at a time" carousel).
The demo data is fictional: Alex Morgan, four friends, and the made-up Harbour Pines and Maple Hollow clubs.

1. Start the web build: `npx expo start --web` (http://localhost:8081).
2. Run the capture once per machine with `npm i --no-save playwright-core`, then `node scripts/website-shots/capture.js`.
   It uses Edge; set `BROWSER` to point at another Chromium. The capture plays one full round and sets up a second,
   then saves `raw/*.png` (402x778 @2x).
3. Run `python scripts/website-shots/frame.py` (needs Pillow). It adds the 9:41 status bar, the Dynamic Island, the
   home indicator and rounded corners, and writes 640x1391 PNGs to `framed/`.
4. Copy `framed/*.png` to `website/assets/img/` as `01-home.png` … `09-profile.png`.
