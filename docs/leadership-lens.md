# Leadership-Lens

Public entry: `/Leadership-Lens.html`. Two scenario screens contain three questions each; Back preserves answers and shuffled order. A separate tiebreaker appears only for top ties, showing two or three eligible answers. One point per main answer; tiebreaker does not change scores. Lead 3+ = Strong, 2 = Clear, 1 or tie = Moderate. All 729 main-answer combinations are tested.

Results at `/leadership-lens-results.html` are calculated from a snapshot of the completed assessment in sessionStorage. No email or participant data is submitted to the server. Results cannot be shared across devices using the URL. `?lens=head`, `heart`, or `gut` is explicitly labeled profile preview mode with illustrative scores.

Admin: `/admin/leadership-lens.html`, using existing authentication. Save draft uses `leadership_lens_draft_v1` in site_settings. Publish wording validates the two-scenario/six-question structure, three answer mappings, tiebreaker, and complete profiles, then writes `leadership_lens_published_v1`. Only the published setting is available through `/api/content?type=leadership-lens`. The seed configuration supplies the first release and an offline/API-outage fallback. New sessions get published content; existing results retain their original snapshot.

Question text, scenarios, answer text and mappings, tiebreaker text, and all result profile text can be edited in the Studio. Rules are fixed in `js/leadership-lens-core.js`; scoring notes document them. Draft saving allows incomplete content; publishing rejects it. Concurrent editing is last-save-wins.

Run `node tests/leadership-lens-scoring.mjs` and `node tests/leadership-lens.cjs`. Local-only preview server is separate from deployment and uses no production credentials.

Intro artwork: `assets/leadership-lens-hero.png`, generated with the built-in image generation tool. Prompt: Three equally sized overlapping optical glass lenses on warm ivory stone, refracting the same landscape differently; sage, amber and clear smoky glass, soft daylight, refined horizontal editorial still life. No people, faces, hands, eyes, silhouettes, text, logos or watermark.

Color revision: assets/leadership-lens-hero-v2.png. Built-in image tool edit prompt: Preserve the three-lens composition; remove orange/sepia cast; match cream #fdfbf7, beige #f4f1ea, forest green #4a6741, muted gold #c5a065, and charcoal #1c2321 with neutral daylight. No people or text.

Background simplification: assets/leadership-lens-hero-v3.png. Built-in image edit prompt: Preserve three glass lenses and site colors; remove landscape, foliage, wall and stone textures, including through lenses; use seamless plain warm ivory backdrop and smooth matte surface with subtle shadows and refracted light. No people or text.

Five-lens artwork: assets/leadership-lens-hero-v4.png. Built-in image edit prompt: Add one blue-sage lens on the far left and one rose-taupe lens on the far right, preserving the three existing green, gold and clear lenses; exactly five equal glass circles, plain ivory background, no people or text.

Close-score clarification: a one-point lead (3/2/1) now triggers the same editable final motivation reflection, restricted to the two leading lenses. The answer selects the primary profile without adding points; the original six-answer scores remain visible and preference remains Moderate. Exact two-way and three-way ties retain their original handling. A two-point or larger lead skips the reflection. Earlier saved results without the new reflection retain their original leading profile.

Local contact handoff: the real-results coaching button carries a one-time sessionStorage summary to `/?assessment=leadership-lens#contact`. It includes the primary lens, all three original counts and rounded percentage shares, preference wording, and reflection context. The homepage appends it to `cf-message`, preserving existing text and preventing duplicate insertion. Preview/sample results do not transfer. No result data is put in the URL or sent until the visitor submits the existing form. Test with `node tests/leadership-lens-contact.mjs`.

Local server now runs from `../tools/leadership-preview.py`. Its assessment content endpoint reads the public production config on each request and caches the most recent successful response for outages. Refresh the assessment to see newly published production wording. Local Admin saves remain in the isolated local store and do not affect that participant content source or production. Earlier local wording refinements are preserved in `docs/leadership-lens-refined-local-2026-10-16.json`.

Third scenario upgrade: the opportunity scenario adds Q7–Q9. New assessments total nine points and show three scenario screens. Exact ties and one-point leads still receive the final reflection, without adding points. Scores and contact percentage summaries use the actual question count. Published two-scenario configurations and saved Admin drafts gain the opportunity scenario on load, preserving the first two scenarios; saving/publishing thereafter persists all three. Existing completed six-question result snapshots remain readable. All 19,683 nine-question answer combinations are tested.
