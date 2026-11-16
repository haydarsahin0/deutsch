#!/bin/sh
# s10: capture (12 drawings/s) -> 24 fps video + hook title + karaoke subtitles + voice segment -> out/short.mp4, out/cover.jpg
#   THREE=<dir containing node_modules/three> sh build.sh        (npm install three@0.170.0 in that dir first)
set -e
HERE=$(cd "$(dirname "$0")" && pwd); REPO=$(cd "$HERE/../.." && pwd)
FR=${FRAMES:-$HERE/out/frames}
[ -n "$SKIP_CAPTURE" ] || node "$HERE/capture.js" --modules "${THREE:?set THREE}" --out "$FR" --workers "${WORKERS:-4}"
python3 "$HERE/subs.py"
ffmpeg -v error -y -framerate 12 -i "$FR/f%04d.jpg" -ss 116.30 -t 17.30 -i "$REPO/episodes/02-50-woerter-am-tag/audio/voice.wav" \
  -filter_complex "[0:v]fps=24,drawbox=x=0:y=1612:w=1080:h=156:color=black@0.42:t=fill,ass=$HERE/subs.ass:fontsdir=$REPO/brand/fonts/ttf,format=yuv420p[v]" \
  -map "[v]" -map 1:a -c:v libx264 -preset slow -crf 23 -c:a aac -b:a 192k -t 17.30 -movflags +faststart "$HERE/out/short.mp4"
ffmpeg -v error -y -ss ${COVER_AT:-7.2} -i "$HERE/out/short.mp4" -frames:v 1 -q:v 2 "$HERE/out/cover.jpg"
echo "done: $HERE/out/short.mp4"
