# Working notes for AI assistants (Codex and Claude)

This file is the shared playbook for any AI assistant working on this project. Codex reads `AGENTS.md`; Claude reads `CLAUDE.md`, which points here. Keep this file current. It is listed in `.vercelignore`, so it is never published.

**Owner:** John Paine, Journey Coach Co. (journeycoach.co). Executive coach and certified Enneagram (iEQ9) coach. Prefers clean, direct, practical language with no em dashes.

## Before you start (every session)

1. **Read `docs/HANDOFF.md`** to see what the last assistant did and anything left open.
2. **Run `git status` and `git pull origin main`.** Start from the latest version. If there are uncommitted changes you did not make, ask John before touching them.
3. **Reload any open editor tab** in the browser before editing wording (see "Two places content lives").

## Before you finish (every session)

1. **Run the tests** (below) if you touched Leadership Lens code.
2. **Commit and push to GitHub** (`main`). Do not leave work uncommitted in the folder; the other assistant will not know about it.
3. **Add an entry to `docs/HANDOFF.md`**: date, who you are, what changed, what is live vs. waiting to deploy, and anything left open.
4. **Tell John whether a deploy is needed** and give him the command.

## Where things are

- **Project folder on John's Mac:** `~/Library/CloudStorage/Dropbox-Personal/aiproject/Production`
- **GitHub:** `journeycoach/Production`, branch `main`
- **Hosting:** Vercel project `production` (team "journeycoach's projects", Hobby plan). Static HTML/JS/CSS plus serverless functions in `api/`. Database is Neon Postgres (`api/_db.js`).
- **Live site:** https://www.journeycoach.co

## Deploying

- **GitHub pushes do not deploy on their own yet.** The Vercel "Create Deployment" check reports that no GitHub account is connected, even though John signs in to Vercel with GitHub. The fix to try is Vercel project → Settings → Git → Disconnect, then Connect the repository again.
- **Until that is fixed, John deploys from the project folder:** `vercel --prod`
- **Close Codex (and any editor) before deploying.** Editors with files open have saved older copies over newer files before.
- **Cache busting:** `/js/` and `/css/` files are cached for a year. Whenever you change a script or stylesheet, bump the `?v=` number where it is loaded (the HTML file, or the `import` line in the JS file that imports it). If you skip this, visitors keep the old file.

## Two places content lives (important)

1. **Code and layout** live in files in this folder. Changes need a commit and a deploy.
2. **Leadership Lens wording** (intro, intro box, instructions, scenarios, questions, answers, final reflection, result profiles) lives in the **database**, edited in the admin editor at `/admin/leadership-lens.html`. **Save draft** keeps it private; **Publish wording** makes it live instantly, no deploy needed.

**Rule:** the editor publishes whatever is on screen. A tab opened before someone else's change will overwrite that change when published. This happened between October 19 and 23 and wiped out a question rewrite. Always reload the editor first. Before publishing, compare the saved draft with the live content (`/api/content?type=leadership-lens`) so you only change what you intend.

`data/leadership-lens-draft.js` is the built-in fallback wording used only if the content API is down. Keep it close to the published wording, but the database is the source of truth.

## Leadership Lens

Full details: **`docs/leadership-lens.md`** (scoring, thresholds, question-design principles, tests). Summary:

- Pages: `Leadership-Lens.html` (assessment), `leadership-lens-results.html` (results), `admin/leadership-lens.html` (editor). Logic is in `js/leadership-lens-core.js`.
- Three scenarios × three questions. Participants mark **Most like me** (2 pts) and **Least like me** (0 pts) on each question; the third answer gets 1 pt. 27 points total, up to 18 per lens.
- A lead of 2 points or less triggers a final reflection question (it picks which profile to show; it never changes scores).
- Questions were rewritten on October 19 for balance: equal desirability, no repeated signal words, all nine Enneagram types represented, similar answer lengths. Keep those principles when editing.
- Results never send data to a server. The "Let's talk" button passes a summary to the homepage contact form within the same browser tab.

## Tests

```
node tests/leadership-lens-scoring.mjs
node tests/leadership-lens-pattern.mjs
node tests/leadership-lens-contact.mjs
node tests/leadership-lens.cjs
```

All four should print PASS lines. If you change admin editor code, check that `tests/leadership-lens.cjs` still matches the code it mocks.

## Writing style for site copy

- No em dashes. Use commas or periods.
- No contractions in assessment questions and answers.
- Direct, warm, practical. Leaders should feel respected, not labeled.
- The assessment is "Enneagram-informed," not an Enneagram typing tool. Avoid jargon like "triad" in participant-facing text.

## Other parts of the site

- **Hidden Ceiling assessment:** `Hidden-Ceiling.html`, `js/hidden-ceiling.js`, scored in `api/contact.js`. The built-in questions in those two files must stay identical; a config signature check rejects mismatches.
- **Admin console:** `admin/` (sign-in via `api/admin/auth.js`). Settings, posts, tools, testimonials, contacts.
- **Daily cron:** `api/contact?action=cron_drip` (see `vercel.json`).
- **Never commit secrets.** `.env*` files are ignored by git and Vercel.

## Folders that are never published

`.vercelignore` keeps `docs/`, `tests/`, `exports/`, `AGENTS.md`, `CLAUDE.md` and backups off the live site. Put internal notes in `docs/`.
