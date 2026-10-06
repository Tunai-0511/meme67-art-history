#!/bin/bash
# usage: tools/mktiles.sh   — for each of the 15 era scenes, renders a CLEAN (no transitions) 2-second bar and writes public/tiles/<id>/NNN.jpg (480x270) for the finale mosaic.
# Bar start: t0+2 s (tiktok: t0+4 s, so its phone-wall is inside the tile).  48 frames at 24 fps, bar-aligned so every tile is in the same gesture phase as film time.
set -e
export PATH="$HOME/.local/share/fnm:$HOME/.local/bin:$PATH"; eval "$(fnm env)" 2>/dev/null
cd "$(dirname "$0")/.."
python3 - <<'PY' > /tmp/mktiles_list.txt
import json
tl=json.load(open('public/timeline.json'))
for s in tl['scenes']:
    if s['id'] in ('intro','finale'): continue
    start = s['t0']+ (4 if s['id']=='tiktok' else 2)
    print(s['id'], int(round(start*24)))
PY
while read ID F0; do
  F1=$((F0+47))
  rm -rf "tiles_src/$ID"; mkdir -p "tiles_src/$ID" "public/tiles/$ID"
  node tools/render.mjs --from $F0 --to $F1 --workers 3 --dir "tiles_src/$ID" --query "notrans=1" < /dev/null | tail -1
  # frames are named f<global>.png -> renumber 001..048 and shrink
  i=1
  for f in $(ls tiles_src/$ID/f*.png | sort); do
    ffmpeg -nostdin -y -v error -i "$f" -vf "scale=480:270:flags=lanczos" -q:v 3 "public/tiles/$ID/$(printf '%03d' $i).jpg"
    i=$((i+1))
  done
  echo "tiles $ID: $((i-1)) frames"
done < /tmp/mktiles_list.txt
