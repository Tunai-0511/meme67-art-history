#!/bin/bash
# usage: [CRF=18] tools/encode.sh <frames_dir> <out.mp4> [audio.wav]   (24 fps, H.264, BT.709, AAC 256k)
set -e
export PATH="$HOME/.local/bin:$PATH"
CRF="${CRF:-18}"; FR="${1:-frames}"; OUT="${2:-out/67.mp4}"; AUD="${3:-audio/mix.wav}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
IN=(-framerate 24 -i "$FR/f%05d.png"); MAP=(-map 0:v); EXTRA=()
if [ -f "$AUD" ]; then IN+=(-i "$AUD"); MAP+=(-map 1:a); EXTRA+=(-c:a aac -b:a 256k -ar 48000 -shortest); fi
ffmpeg -y -v error -stats "${IN[@]}" "${MAP[@]}" \
  -vf "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p" -c:v libx264 -preset slow -crf $CRF -r 24 \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 "${EXTRA[@]}" -movflags +faststart -metadata title="67 — a brief history of art" "$OUT"
echo "wrote $OUT"
