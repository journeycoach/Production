# Leadership Lens

Current as of October 27, 2026. This file is internal: `docs/` is listed in `.vercelignore` and is not published.

## Pages

| Page | Purpose |
|---|---|
| `/Leadership-Lens.html` | Participant assessment: intro, three scenario pages, optional final reflection |
| `/leadership-lens-results.html` | Results, calculated in the browser from a sessionStorage snapshot. No data is sent to the server. `?lens=head`, `heart` or `gut` shows a labeled preview with illustrative scores |
| `/admin/leadership-lens.html` | Assessment Studio (existing admin sign-in) |
| `/tools.html` | Resources page with the half-width Leadership Lens card |

## Structure

- Three sections, three questions each (nine questions). As of October 27: "A reorganization is announced", "Your numbers are challenged", and "Looking back" (career patterns). The engine still labels each section "Scenario N of 3". Every question has one Head, one Heart and one Gut answer; answer order is shuffled per participant.
- Final reflection: one extra single-choice question, shown only when the top scores are tied or close. It is limited to the leading lenses and suggests which profile to show first. It never changes the scores.
- The Results page introduces the three centers (Head, Heart, Gut). As of October 23 the intro box also names them up front (it came in with John's intro edits and is not yet confirmed as intended); the October 19 bias review recommended naming them only on the Results page.

## Scoring (most / least ranking)

- For each question the participant marks one answer **Most like me** (2 points) and one **Least like me** (0 points). The unmarked answer earns 1 point.
- Nine questions give 27 points in total. Each lens can earn 0 to 18.
- Preference strength comes from the lead over the second lens:
  - 6 or more points: Strong preference
  - 3 to 5 points: Clear preference
  - 0 to 2 points: Moderate preference. A lead of 1 or 2 shows the "Two perspectives are close" panel but keeps the higher-scoring profile.
  - Exact tie for the top (0 points): the final reflection is shown, limited to the tied lenses, and picks which profile to show. Before October 27, 2026 any lead of 2 or less triggered it.
- Results show each lens as `score / 18 pts`. The contact handoff reports each lens as a share of the 27 points.
- Older single-choice results (one point per answer, nine or six answers) are still scored with the original rules: 3+ Strong, 2 Clear, 1 or less Moderate with reflection.

Rules live in `js/leadership-lens-core.js` (`score`, `RANK_POINTS`, `isCompleteRanking`).

## Question design principles

Keep these when editing wording in the Studio:

1. **Equal desirability.** Every option should sound like something a respected leader could admit. Low-side "inner pattern" questions should be equally candid for all three lenses.
2. **No signal words.** Avoid repeating the same keyword for a lens (for example "valued", "clarity", "right") more than twice across the nine questions.
3. **Center focus only.** Every answer is written to, and scored for, one of the three centers. Do not map or write answers to Enneagram type numbers (changed October 29, 2026 at John's request). Across the nine questions, vary each center's answers across the full range of that center:
   - Head: understanding, certainty and preparation, possibilities and options (core emotion: fear)
   - Heart: connection and helping, worth and standing, being seen and understood (core emotion: shame)
   - Gut: rightness and standards, autonomy and holding ground, steadiness and quiet resistance (core emotion: anger)
4. **Similar length.** Keep the three answers within about three words of each other.
5. **Plain style.** No em dashes, no contractions.

## What You Likely Miss (added October 27, 2026)

- The results page shows a "What You Likely Miss" panel after The High Side / The Low Side, based on the lowest-scoring lens.
- Shown on every result. If the lowest score is within 1 point (ranked) of the next lens, the panel adds a lighter-signal note. Two lenses tied for lowest are both shown; a three-way tie shows all three with an even-scores note.
- Text comes from each profile's `missed` field (Admin editor: "What you likely miss"). Blank falls back to `DEFAULT_MISSED` in `js/leadership-lens-pattern.js`. Logic: `describeLowest()` in the same file, tested in `tests/leadership-lens-pattern.mjs`.

## Editing and publishing

- Studio fields (intro, intro box, instructions, scenarios, questions, answers, final reflection, result profiles) are stored in `site_settings`: `leadership_lens_draft_v1` for drafts and `leadership_lens_published_v1` for live content.
- **Reload the editor before editing.** It publishes whatever is on screen, so a tab opened before another change will overwrite that change.
- **Save draft** keeps edits private. **Publish wording** validates the structure (three scenarios, three questions, one answer per lens, complete profiles) and makes the wording live immediately. No deploy is needed for wording changes.
- Text fields support Bold, Italic, Underline, colors (`{color:#RRGGBB}text{/color}`) and alignment.
- `data/leadership-lens-draft.js` is the built-in fallback used if the content API is unavailable. Keep it in step with the published wording.

## Deploying code changes

- The Vercel login is not yet linked to a GitHub account, so pushes to `main` do not deploy on their own (checked October 20, 2026).
- Deploy from this folder: `vercel --prod`.
- Static files under `/js/` and `/css/` are cached for a year. Bump the `?v=` query on the importing file whenever a script or stylesheet changes.

## Tests

Run from the project root:

```
node tests/leadership-lens-scoring.mjs
node tests/leadership-lens-pattern.mjs
node tests/leadership-lens-contact.mjs
node tests/leadership-lens.cjs
```

## Assets

- Intro image: `assets/leadership-lens-hero-v5.png`, a magnifying glass (Head), spectacles (Heart) and compass (Gut) in site colors. Earlier photographic versions were removed on October 19, 2026.

## History

Dated snapshots in this folder (`*-2026-10-16.*`) record Codex's October 16 language review and earlier wording, kept for reference.

## Pending October 24 cleanup

Admin save/publish now sends `_lensExpected`, containing the exact draft and published strings loaded by the editor. The API checks both under row locks before applying a single update; stale or older clients receive HTTP 409. It preserves browser edits and offers export/reload/merge guidance. Save and publish operations are serialized within each tab. Tests: `node tests/leadership-lens-settings-route.mjs` and `node --env-file=.env.local tests/leadership-lens-settings.mjs` (isolated temporary PostgreSQL table).

Five Gut wording refinements are saved as an unpublished Admin draft. See the newest HANDOFF entry before deployment or publishing.
