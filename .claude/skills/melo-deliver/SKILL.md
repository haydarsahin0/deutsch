---
name: melo-deliver
description: Hand finished videos, images and texts to the owner so he can watch AND download them on his iPad — size limits, compression, the ZIP download trick, what doesn't work. Use whenever sending a rendered video, Short, thumbnail or text package to the owner.
---

# Delivering files to the owner

- `SendUserFile` limit is **500 MiB**. A 12-min episode at crf 21 is ~550 MB → re-encode for sending: `ffmpeg -i out/video.mp4 -c:v libx264 -preset fast -crf 23 -profile:v high -pix_fmt yuv420p -c:a copy -movflags +faststart <scratchpad>/FolgeNN.mp4` (~350 MB, visually identical). Run in background.
- The iPad app **plays MP4s but shows no download button**. Always ALSO send an **uncompressed ZIP** (`zipfile.ZIP_STORED`) containing the video + cover(s) + `meta.md` (+ `.srt`). The app can't play a ZIP, so it offers save/open-in → Dateien → tap to unzip.
- Doesn't work (tested): Git LFS push (403 from this environment), GitHub > 100 MB, public file hosts (network-blocked; also never upload owner content to third parties without asking), Artifact assets (15 MB/file).
- Copy deliverables into the scratchpad with clear German names (`Folge01-Das-sagt-kein-Deutscher.mp4`, `Short02-Cover.png`, `Short02-Paket.zip`); `display: attach` for videos/ZIPs, `render` for images.
- Never commit big binaries: `out/*.mp4`, `audio/voice.wav`, `shorts/*/build/`, `engine/dev/stills/` are gitignored; covers/thumbnails (PNG/JPG) are committed.
- In the message: what it is, duration/size, every text in a code block, and the 1–2 actions he must do in YouTube Studio.
