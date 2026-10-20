# Leadership Lens

Current as of October 19, 2026. This file is internal: `docs/` is listed in `.vercelignore` and is not published.

## Pages

| Page | Purpose |
|---|---|
| `/Leadership-Lens.html` | Participant assessment: intro, three scenario pages, optional final reflection |
| `/leadership-lens-results.html` | Results, calculated in the browser from a sessionStorage snapshot. No data is sent to the server. `?lens=head`, `heart` or `gut` shows a labeled preview with illustrative scores |
| `/admin/leadership-lens.html` | Assessment Studio (existing admin sign-in) |
| `/tools.html` | Resources page with the half-width Leadership Lens card |

## Structure

- Three scenarios, three questions each (nine questions). Every question has one Head, one Heart and one Gut answer; answer order is shuffled per participant.
- Final reflection: one extra single-choice question, shown only when the top scores are tied or close. It is limited to the leading lenses and suggests which profile to show first. It never changes the scores.
- The intro does not name Head, Heart and Gut. The Results page introduces the three centers.

## Scoring (most / least ranking)

- For each question the participant marks one answer **Most like me** (2 points) and one **Least like me** (0 points). The unmarked answer earns 1 point.
- Nine questions give 27 points in total. Each lens can earn 0 to 18.
- Preference strength comes from the lead over the second lens:
  - 6 or more points: Strong preference
  - 3 to 5 points: Clear preference
  - 0 to 2 points: Moderate preference, and the final reflection is shown
- Results show each lens as `score / 18 pts`. The contact handoff reports each lens as a share of the 27 points.
- Older single-choice results (one point per answer, nine or six answers) are still scored with the original rules: 3+ Strong, 2 Clear, 1 or less Moderate with reflection.

Rules live in `js/leadership-lens-core.js` (`score`, `RANK_POINTS`, `isCompleteRanking`).

## Question design principles

Keep these when editing wording in the Studio:

1. **Equal desirability.** Every option should sound like something a respected leader could admit. Low-side "inner pattern" questions should be equally candid for all three lenses.
2. **No signal words.** Avoid repeating the same keyword for a lens (for example "valued", "clarity", "right") more than twice across the nine questions.
3. **Type coverage.** Across the nine questions, each lens's answers rotate through its three Enneagram types, three answers each:
   - Head: 5 (understanding), 6 (security, risk), 7 (possibilities)
   - Heart: 2 (helping, connection), 3 (results, image), 4 (meaning, being seen)
   - Gut: 8 (strength, direct action), 9 (calm, harmony), 1 (standards, integrity)
4. **Similar length.** Keep the three answers within about three words of each other.
5. **Plain style.** No em dashes, no contractions.

## Editing and publishing

- Studio fields (intro, intro box, instructions, scenarios, questions, answers, final reflection, result profiles) are stored in `site_settings`: `leadership_lens_draft_v1` for drafts and `leadership_lens_published_v1` for live content.
- **Save draft** keeps edits private. **Publish wording** validates the structure (three scenarios, three questions, one answer per lens, complete profiles) and makes the wording live immediately. No deploy is needed for wording changes.
- Text fields support Bold, Italic, Underline, colors (`{color:#RRGGBB}text{/color}`) and alignment.
- `data/leadership-lens-draft.js` is the built-in fallback used if the content API is unavailable. Keep it in step with the published wording.

## Deploying code changes

- Pushes to `main` on GitHub should deploy automatically (Vercel login relinked to GitHub on October 20, 2026).
- If a push does not deploy, deploy from this folder: `vercel --prod`.
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
