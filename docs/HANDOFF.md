# Handoff log

Newest entries first. Each assistant (Claude or Codex) adds an entry at the end of a session: date, who, what changed, what is live vs. waiting to deploy, and open items. Keep entries short.

---

## 2026-10-23 · Claude

**State at end of session: everything live, GitHub and the Mac folder in sync, nothing waiting to deploy.**

- Restored the October 19 question rewrite in the editor. Sometime between October 19 and 23, an editor tab with older wording was published and reverted the questions, answers, final reflection and instructions. John's newer intro and intro box edits were kept.
- Added `AGENTS.md`, `CLAUDE.md` and this log so Claude and Codex can hand work to each other.
- Open: Vercel still does not deploy from GitHub pushes (see `AGENTS.md`, Deploying).
- Open: the intro box now names the Head, Heart and Gut centers before people answer. It came in with John's intro edits; he has not said whether he wants it. The October 19 bias review had moved that naming to the Results page. Ask John before changing it.

## 2026-10-20 · Claude

- Hid `docs/`, `tests/` and `exports/` from the live site via `.vercelignore`.
- Removed four unused hero images. Only `assets/leadership-lens-hero-v5.png` is used.
- Rewrote `docs/leadership-lens.md` for the current scoring.
- Tested whether GitHub pushes deploy: they do not yet.

## 2026-10-19 · Claude

- Switched scoring to Most like me / Least like me (2/1/0 points, 27 total, 18 max per lens). Updated results, close-score panel, contact summary and tests.
- Rewrote all nine questions and the final reflection for balance and Enneagram type coverage.
- Moved Head/Heart/Gut naming from the intro to the Results page.
- Language cleanup on results (removed "triad", reduced hedging), new three-lens illustration (magnifying glass, spectacles, compass).
- Brought GitHub up to date with everything deployed since October 15.

## 2026-10-16 to 2026-10-17 · Codex

- Added the third scenario ("An opportunity to shape something new"), close-score final reflection, contact form prefill from results, collapsible sections in the editor, and the language review in `docs/leadership-lens-language-review-2026-10-16.md`.

## 2026-10-15 · Claude

- Shipped the Leadership Lens assessment, results page and admin editor that Codex started; added formatting tools, floating Save/Publish, editable intro box, and the Resources page card.
