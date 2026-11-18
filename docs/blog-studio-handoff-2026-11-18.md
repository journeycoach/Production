# Blog workspace update, 2026-11-18, Codex

Implemented locally, NOT deployed.

- Existing admin/posts.html now includes private fast capture, search, stage and history filters, optional coaching notes, named immutable draft versions, side-by-side comparison, per-version review notes/checklist, copying, related themes and linked ideas.
- New authenticated /api/admin/ideas uses the existing session and Neon connection. Private leadership_ideas table is created on first authenticated access. Optimistic revisions reject stale writes. All API responses are private/no-store. No private content is embedded in static HTML or exposed by the public content API.
- Selected saved version opens in existing post-edit.html. Loading never publishes; the normal Publish Post action remains explicit. Plain text is escaped and converted to paragraphs. Publication from an idea inserts the public post and its exact published snapshot/private history in one SQL statement. Existing post editing and URLs are unchanged.
- Independent manual blog/LinkedIn use records retain saved-version snapshots; LinkedIn recording never touches posts. Date-range reviews retain channel and uncertainty. Imported historical records without identifiable versions remain preserved as uncertain source records.
- JSON import accepts arrays, ideas, entries, or data.ideas; maps sourceNotes/coreObservation/draftVersions/usageHistory, retains each complete original, previews mapped data, skips duplicate source IDs (or content hashes when IDs absent), and safely resumes partial imports. A real Leadership Notebook backup was not supplied, so additional schema mappings may be needed after inspecting that backup.

Validation: node --experimental-vm-modules tests/ideas.mjs passes domain and mocked-route tests for one-line capture, versions, LinkedIn isolation, auth-before-storage for direct-ID GET/POST/PUT, stale writes, source preservation, and duplicate keys. Syntax and git diff checks pass. Editor/public-route checks are structural, not browser tests.

Outstanding release gates: browser walkthrough of capture, side-by-side compare, LinkedIn recording and editor loading; real Neon integration verification of new table and publishing CTE; signed-out browser/direct URL checks on a preview deployment. Do not deploy production until these pass.

Environment blockers: git pull origin main could not resolve github.com; local HTTP server bind failed with Operation not permitted. Do not include pre-existing uncommitted Leadership Lens changes (Leadership-Lens.html, css/leadership-lens.css, js/leadership-lens.js, docs/HANDOFF.md) in this release. Existing HANDOFF.md was left untouched because it already had unrelated uncommitted changes; this separate handoff records the work.

After release gates pass, deploy the isolated blog change from Production with `vercel --prod`. Do not deploy this mixed working directory directly.

## Follow-up: compact All Posts card

All Posts is now a native keyboard-accessible collapsible details card, expanded by default with the three newest posts. Show older posts reveals the complete list; the same button returns to the compact view. Posts are sorted by date, then ID. Local change only, needs deployment with the workspace release. Existing unrelated HANDOFF.md edits remain untouched.
