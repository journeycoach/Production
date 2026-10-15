# Leadership-Lens

Public entry: `/Leadership-Lens.html`. Two scenario screens contain three questions each; Back preserves answers and shuffled order. A separate tiebreaker appears only for top ties, showing two or three eligible answers. One point per main answer; tiebreaker does not change scores. Lead 3+ = Strong, 2 = Clear, 1 or tie = Moderate. All 729 main-answer combinations are tested.

Results at `/leadership-lens-results.html` are calculated from a snapshot of the completed assessment in sessionStorage. No email or participant data is submitted to the server. Results cannot be shared across devices using the URL. `?lens=head`, `heart`, or `gut` is explicitly labeled profile preview mode with illustrative scores.

Admin: `/admin/leadership-lens.html`, using existing authentication. Save draft uses `leadership_lens_draft_v1` in site_settings. Publish wording validates the two-scenario/six-question structure, three answer mappings, tiebreaker, and complete profiles, then writes `leadership_lens_published_v1`. Only the published setting is available through `/api/content?type=leadership-lens`. The seed configuration supplies the first release and an offline/API-outage fallback. New sessions get published content; existing results retain their original snapshot.

Question text, scenarios, answer text and mappings, tiebreaker text, and all result profile text can be edited in the Studio. Rules are fixed in `js/leadership-lens-core.js`; scoring notes document them. Draft saving allows incomplete content; publishing rejects it. Concurrent editing is last-save-wins.

Run `node tests/leadership-lens-scoring.mjs` and `node tests/leadership-lens.cjs`. Local-only preview server is separate from deployment and uses no production credentials.

Intro artwork: `assets/leadership-lens-hero.png`, generated with the built-in image generation tool. Prompt: Three equally sized overlapping optical glass lenses on warm ivory stone, refracting the same landscape differently; sage, amber and clear smoky glass, soft daylight, refined horizontal editorial still life. No people, faces, hands, eyes, silhouettes, text, logos or watermark.

Color revision: assets/leadership-lens-hero-v2.png. Built-in image tool edit prompt: Preserve the three-lens composition; remove orange/sepia cast; match cream #fdfbf7, beige #f4f1ea, forest green #4a6741, muted gold #c5a065, and charcoal #1c2321 with neutral daylight. No people or text.

Background simplification: assets/leadership-lens-hero-v3.png. Built-in image edit prompt: Preserve three glass lenses and site colors; remove landscape, foliage, wall and stone textures, including through lenses; use seamless plain warm ivory backdrop and smooth matte surface with subtle shadows and refracted light. No people or text.
