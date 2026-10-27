# Handoff log

Newest entries first. Each assistant (Claude or Codex) adds an entry at the end of a session: date, who, what changed, what is live vs. waiting to deploy, and open items. Keep entries short.

---

## 2026-10-27 · Claude, new scenarios published

John asked to replace the live questions with the version developed in his Claude Doc "Leadership Lens Assessment Answer Key" (scenario version) and to verify the results logic.

- **Published (live now, no deploy needed):** three sections. 1) "A reorganization is announced" (reorg-q1 to q3), 2) "Your numbers are challenged" (challenge-q1 to q3), 3) "Looking back" (pattern-q1 to q3: reaction to manage, best contribution, most common criticism). New final reflection: fear / how I am seen / anger at what is not right. Panel note updated to "Two scenarios and a look back at your working life, three questions each." Intro, instructions, intro box title/body and all three result profiles unchanged. Contractions removed per site style.
- Published through the guarded Admin API: saved draft first, confirmed draft matched and published was unchanged, then published. Public API now matches the tested config exactly (SHA-256 90a876e0...).
- **Verified:** all five test suites pass; 300,000 random ranked answer sets all resolve to a primary lens (with the final reflection when needed); consistent answer patterns score 18/18 Strong for the intended lens; random answering splits evenly across lenses. Walked the live page twice: consistent Gut answers gave The Instinctive Lens 18/18 Strong; Head 14 / Heart 13 triggered the final reflection with only those two options, and choosing Heart showed The Relational Lens with the close-score explanation.
- **Code (needs deploy):** data/leadership-lens-draft.js now equals the published wording exactly; cache version bumped to v=scenarios-20261027 in Leadership-Lens.html, leadership-lens-results.html, admin/leadership-lens.html. tests/leadership-lens-scoring.mjs: the invalid-mapping check now duplicates another answer's center instead of assuming the first answer is not Head.
- **Open for John:** the eyebrow still reads "Scenario 3 of 3" on the Looking back section; the Gut result profile's High Side still uses "clarity" and "momentum," which lean away from the instinct/boundaries focus of the new questions; the intro box body has a typo ("this assessments offers"). Older editor tabs will now get a 409 and must reload.

## 2026-10-25 · Codex, cleanup release

John explicitly requested all updates published. Pulled main (already current, clean). Deployed an isolated git archive of c7df3ac, so shared editor files were not overwritten. Production READY: dpl_E65pN4aTdjNvUrfLBj4aywEyQKab, https://www.journeycoach.co. Confirmed saved draft exactly matched approved October 24 snapshot; published it with guardedAssessmentWrite using both original draft/live baselines. Public API now exactly matches the approved snapshot, and fetched assessment/editor/results assets match the release. All five cleanup items are live; nothing remains pending from this release. Reload existing Admin tabs before editing (older clients now receive 409 rather than overwrite newer content). This handoff-only commit needs no deployment.

## 2026-10-24 · Codex, five approved cleanup items

Started from clean, current main at 242d7d4. Implemented all five John approved: guarded Admin saves/publishes compare both loaded draft/live snapshots under PostgreSQL row locks (old clients without baselines receive 409); preserves unsaved edits and instructs export/reload/merge on conflict. Admin preview now uses Most/Least selections and clears the opposite choice on the same answer. Participant and preview rank controls include answer text in accessible labels. Results explain 2/1/0, 18 maximum per lens, 27 total and contact percentage denominator. Cache versions bumped.

Five targeted Gut answers refined around autonomy, holding ground, and quiet resistance. Saved ONLY to the latest production Admin draft with an exact prior-value guard; published wording was NOT changed. Snapshot: docs/leadership-lens-cleanup-draft-2026-10-24.json. Fallback and legacy third-scenario upgrade wording also updated, preserving all other wording and mappings. Do not republish an older editor tab.

Code is committed/pushed but NOT deployed. John should close existing editors, then run `vercel --prod` from Production. After deployment reload the Admin editor, review the saved draft, and Publish wording when ready. Until deployment, production still uses the older editor without conflict protection.

All four normal suites pass, plus tests/leadership-lens-settings-route.mjs. Integration test `node --env-file=.env.local tests/leadership-lens-settings.mjs` passes guarded write/conflict cases in an automatically dropped TEMP table; no production rows touched by that test. No manual browser walkthrough of these latest changes yet. Full rewrite or scoring changes were not made.

## 2026-10-24 · Codex

Read-only assessment review requested by John. Pulled origin/main (already current at 55c6652); working tree was clean. Downloaded live assessment sources separately into /tmp/leadership-review-live-20261024 and public wording into /tmp/leadership-live-review-20261024.json. Eight assessment/editor source files matched the local checkout. Production deployment: dpl_6ie39HnW1gFLTWJmLAtztNanxihC. All four documented test suites pass (including 40,000 ranked cases). No application code, database wording, or deployment changed.

Review findings: stale editor publishing remains last-write-wins with no revision check; ranked radios have repeated Most/Least labels without the associated answer text in their accessible names; Admin Preview still renders single-choice inputs despite ranked instructions. Editorial concern: Q7 Gut wording (lead/set direction/make something strong happen) conflicts with the original boundary/autonomy focus, and several calm/peace/direct-conversation answers identify behavior more than motivation. Intro naming Head/Heart/Gut remains an optional priming concern already flagged by Claude. Recommend conflict protection first, then accessibility/preview fixes, then user-reviewed wording refinement. No deployment needed for this internal note.

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
