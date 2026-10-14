#!/usr/bin/env bash
# App Store screenshots on one simulator: creates it, sets the status bar to 9:41, installs the demo-data build, runs
# .maestro/screenshots.yaml and flattens the PNGs (App Store Connect refuses an alpha channel). Needs a Release
# simulator build made with EXPO_PUBLIC_DEMO_DATA=1 in build/ (see scripts/screenshots.md), Xcode and Maestro. Run
# from anywhere; the PNGs land in screenshots/<folder>/.
#
#   scripts/screenshots-ios.sh <folder> "<device>" ["<fallback device>" ...]
#   scripts/screenshots-ios.sh dynamic-island-large "iPhone 17 Pro Max" "iPhone 16 Pro Max"
set -euo pipefail

FOLDER=$1
shift
ROOT=$(cd "$(dirname "$0")/.." && pwd)
APP=${APP:-$(ls -d "$ROOT"/build/Build/Products/Release-iphonesimulator/*.app | head -n 1)}
OUT="$ROOT/screenshots/$FOLDER"
NAMES="01-round 02-scorecard 03-standings 04-new-round 05-results 06-home"

# The newest iOS runtime installed.
RUNTIME=$(xcrun simctl list runtimes -j | python3 -c '
import json, sys
rs = [r for r in json.load(sys.stdin)["runtimes"] if r.get("isAvailable") and r["name"].startswith("iOS")]
rs.sort(key=lambda r: [int(p) for p in r["version"].split(".")])
print(rs[-1]["identifier"])')

# The first of the named devices this Xcode knows.
TYPE=""
for name in "$@"; do
  TYPE=$(xcrun simctl list devicetypes -j | python3 -c '
import json, sys
print(next((d["identifier"] for d in json.load(sys.stdin)["devicetypes"] if d["name"] == sys.argv[1]), ""))' "$name")
  if [ -n "$TYPE" ]; then
    echo "Screenshots $FOLDER: $name on $RUNTIME"
    break
  fi
done
if [ -z "$TYPE" ]; then
  echo "None of these simulators exist in this Xcode: $*" >&2
  exit 1
fi

UDID=$(xcrun simctl create "Screenshots $FOLDER" "$TYPE" "$RUNTIME")
trap 'xcrun simctl shutdown "$UDID" >/dev/null 2>&1 || true; xcrun simctl delete "$UDID" >/dev/null 2>&1 || true' EXIT
xcrun simctl boot "$UDID"
xcrun simctl bootstatus "$UDID" -b
xcrun simctl ui "$UDID" appearance light
xcrun simctl status_bar "$UDID" override --time "9:41" --dataNetwork wifi --wifiMode active --wifiBars 3 \
  --cellularMode active --cellularBars 4 --batteryState charged --batteryLevel 100
xcrun simctl install "$UDID" "$APP"

mkdir -p "$OUT"
STAMP=$(mktemp)
# A fresh simulator on a busy CI Mac can be slow to start Maestro's driver ("iOS driver not ready in time"): allow five
# minutes, and run the flow once more if it fails. It starts from a clean install, so only that run's PNGs are kept.
export MAESTRO_DRIVER_STARTUP_TIMEOUT=${MAESTRO_DRIVER_STARTUP_TIMEOUT:-300000}
if ! (cd "$OUT" && maestro --device "$UDID" test "$ROOT/.maestro/screenshots.yaml"); then
  echo "Maestro failed; running the flow once more" >&2
  rm -f "$OUT"/0*.png
  touch "$STAMP"
  (cd "$OUT" && maestro --device "$UDID" test "$ROOT/.maestro/screenshots.yaml")
fi

# Maestro saves a screenshot where it runs or in its test output, depending on the version: gather them here.
for n in $NAMES; do
  if [ ! -f "$OUT/$n.png" ]; then
    found=$(find "$ROOT/.maestro" "$HOME/.maestro" -name "$n.png" -newer "$STAMP" 2>/dev/null | head -n 1)
    if [ -n "$found" ]; then mv "$found" "$OUT/$n.png"; fi
  fi
  if [ ! -f "$OUT/$n.png" ]; then
    echo "Missing $n.png" >&2
    exit 1
  fi
done

# "Images can't include alpha channels or transparencies" (App Store Connect, since July 2026): flatten onto white.
VENV="${TMPDIR:-/tmp}/bb-screenshots-venv"
if [ ! -x "$VENV/bin/python" ]; then
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install --quiet pillow
fi
"$VENV/bin/python" - "$OUT"/0*.png <<'PY'
import sys
from PIL import Image

for path in sys.argv[1:]:
    image = Image.open(path).convert("RGBA")
    flat = Image.new("RGB", image.size, (255, 255, 255))
    flat.paste(image, mask=image.getchannel("A"))
    flat.save(path, optimize=True)
    print(f"{path.split('/screenshots/')[-1]}: {flat.size[0]} x {flat.size[1]}, {flat.mode}")
PY
