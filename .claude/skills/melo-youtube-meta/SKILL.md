---
name: melo-youtube-meta
description: Write YouTube titles, descriptions (with chapters), tags, pinned comments, channel description and channel keywords for "Deutsch mit Melo" in German, SEO-optimised and with tags that literally match title/description. Use when the owner asks for başlık, açıklama, etiket, anahtar kelime, SEO or channel texts.
---

# YouTube metadata (German, SEO, owner's rules)

Model: write it yourself (Opus) — it's quality-defining but small. Deliver every text in its own ```code block```.

## Long video `episodes/NN/meta.md`
- **Title** (section `## Titel (final)`, `**…**`): ≤ 60–65 chars so it isn't cut on mobile; exact high-volume phrase first, one CAPS word as eye-catcher, curiosity/number („Das sagt KEIN Deutscher! 12 Sätze, die dich sofort verraten“). Give 3 alternatives for YouTube's „Titel testen“.
- **Description**: first 2 lines = hook + main keywords (they show in search). Then a paragraph that naturally contains the search phrases you'll use as tags („typische Fehler im Deutschen“, „natürlich Deutsch sprechen“, „Deutsch wie ein Muttersprachler“, „Deutsch für Fortgeschrittene“, „Goethe-Zertifikat B2, telc B1“, „Deutsch mit Melo“), a comment question, **chapters** from `python3 tools/chapters.py episodes/NN` (first must be 0:00, ≥ 3 chapters, ≥ 10 s each), „📚 Das lernst du in diesem Video (Deutsch B1, Deutsch B2, Deutsch C1)“ bullet list, subscribe line, one English + one Turkish reach line („Learn German: …“, „Almanca öğrenenler için: …“), 3 hashtags.
- **Tags**: ordered by priority — exact title phrase → big generic terms → level terms → long-tail topic phrases → exams → English/Turkish → brand. **Every tag must appear literally in title or description** (owner requirement) and the list must fit 500 chars (tags with spaces count +2): `python3 tools/check-long-meta.py episodes/NN/meta.md` → exit 0. If a tag is missing, change the description wording or the tag — never leave it.
- **Pinned comment**: German, playful, a question + a C1 bonus question.
- Remind: upload `out/subtitles.de.srt` (Untertitel → Deutsch), video language Deutsch, end screen, playlist, Test & Compare thumbnails.

## Shorts
See `melo-shorts` §5 (`shorts/check-meta.py`).

## Channel texts (once per channel)
Description ≤ 1000 chars (who/what/levels/weekly/exams/subtitles, slogan at the end) → `docs/kanal-beschreibung.txt`; channel keywords ≤ 500 chars in quotes → `docs/kanal-keywords.txt`; handle suggestion (owner checks availability).
