---
name: sync-api-docs
description: Propagate a change to the /api/gen surface (new/changed param, behavior, limitation) across every documentation location in this repo — README, llms.txt, home page, framework integration guides. Use after shipping or reviewing an API change, or when asked to update/sync/audit the docs.
---

Whenever `/api/gen`'s public surface changes (a new or changed field on `GenParams`/`PdfOptions`, a new item type, a changed status code, a new limitation), the same fact tends to need repeating in several independent places that don't auto-sync with each other. This skill is the checklist for finding and fixing the drift — it is **not** a one-off task, run it every time the API surface moves.

The gap this exists to close was found for real: shipping `pdfOptions` updated `README.md` but left the home page's feature list still saying "Customizable page settings (soon, open to contribution)" with the old orange icon, and `public/llms.txt` never mentioned `pdfOptions` at all.

## Step 1 — Establish the ground truth

Before touching any doc, read the actual current API shape, not a memory of it:

- `src/app/api/gen/types.ts` — `GenParams`, `PdfOptions`, any validators (`isValidCssLength`, etc.).
- `src/app/api/gen/route.ts` — status codes, error messages, which content-types are accepted.
- `src/app/api/gen/parsers.ts` — field names/aliases, merge order per input method (JSON/form/GET differ today: JSON+GET use a fixed order, form data preserves literal field order).
- `README.md`'s own parameter table, since it's usually (but not guaranteed) the freshest — treat it as a *candidate* answer to diff the others against, not as ground truth by itself.

## Step 2 — Walk every surface

Each of these is either hand-maintained (must be checked and edited manually) or derived (editing one place is enough — don't waste an edit on the other).

| Surface | File(s) | Maintained | Notes |
| --- | --- | --- | --- |
| Human API reference | `README.md` | Hand | Features list, parameter table(s), curl examples, "Known limitation" notes. |
| AI-agent API reference | `public/llms.txt` | Hand | Terser, agent-oriented restatement of the same facts as README (endpoint behavior, item types, merge order, response codes, constraints). Keep it factually consistent with README, not necessarily word-for-word. Linked from `<head>` via `layout.tsx`'s `alternates.types['text/markdown']`. |
| Home page marketing copy | `src/app/page.tsx` | Hand | The "Features" `<ul>` checkmarks (a shipped feature needs its bullet turned from the orange "soon" icon to the green `CheckIcon`, wording matched to README's equivalent bullet) and the narrative paragraphs in "Get Started". This is the surface most likely to be forgotten — it doesn't visually sit next to the API code the way README does. |
| Home page curl example + Playground defaults | `src/lib/examples.ts` (consumed by `src/app/page.tsx` via `CURL_CODE` and by `src/components/Playground.tsx` via the `EXAMPLE_*` constants) | Hand, but **single source** | Edit the constants here once; both the home page and the Playground pick it up automatically. Don't hand-edit a curl string separately in `page.tsx` or `README.md`'s examples without also checking whether it should just reuse `CURL_CODE`/an `EXAMPLE_*` constant instead, to avoid the three drifting independently. |
| Interactive API form | `src/components/Playground.tsx` | Hand | Add a form field for any new *user-facing* param (see the `pdfOptions.headerTemplate`/`footerTemplate`/`margin.*` fields for the pattern: dotted names matching form-data parsing, `EXAMPLE_*` constants as `defaultValue`, POST-only fields gated on `method === 'POST'`). |
| Laravel integration guide | `src/lib/docs-content/laravel.ts`, rendered by `src/app/docs/laravel/page.tsx` (React) and `src/app/docs/laravel.md/route.ts` (raw markdown) | Hand, but **single source** | Both renderers import the same exported constants — editing the `.ts` file updates both automatically. Never edit inside the two route/page files themselves. |
| TypeScript integration guide | `src/lib/docs-content/typescript.ts`, rendered the same dual way via `src/app/docs/typescript/page.tsx` and `typescript.md/route.ts` | Hand, but **single source** | Same pattern as Laravel. |
| Changelog | `CHANGELOG.md` | **Auto-generated** | Produced by `gitmoji-changelog` on release (`after:bump` in `.release-it.json`), from gitmoji-prefixed commit messages. Never hand-edit it — if it's wrong, the fix is a better commit message on the next release, not an edit here. |
| Next.js build output | `.next/**/docs/*.md` etc. | **Generated** | Build artifacts, not source. Never edit; they're overwritten on the next build. |

## Step 3 — Decide whether the framework guides need the new capability at all

`docs-content/laravel.ts` and `docs-content/typescript.ts` are **deliberately minimal** illustrative wrappers, not exhaustive API bindings — evidenced by the fact that neither one covers `files` (multipart upload) either, despite it being a real, longstanding `/api/gen` capability. Both already end with an explicit escape hatch sentence:

> For direct file uploads (PDF/image/HTML as `multipart/form-data`, 4 MB max), see the [multipart form data section]... of the project's README, or [/llms.txt] for the full API reference.

Default to **not** adding every new param to these two wrapper classes. Instead:

- If the capability is a core, broadly-applicable use case most consumers of a thin wrapper would want (judgment call — ask if unsure) → add fluent methods to `SERVICE_CODE`/`CLIENT_CODE` and a `paramRows` entry, following the existing method-per-field pattern.
- Otherwise (the common case for optional/advanced params like `pdfOptions`) → extend the existing escape-hatch sentence to also mention the new capability by name, so a reader knows it exists and where to find the full reference, without bloating the minimal example. Don't add it silently to only one of the two guides — keep Laravel and TypeScript symmetric.

## Step 4 — Verify

- `yarn typecheck` — `docs-content/*.ts` files are plain exported string constants; a syntax slip (unescaped backtick/quote inside a template literal) is a real risk when editing embedded PHP/TS/bash code and typecheck/build will catch it.
- `yarn lint`.
- Read back the two `.md` routes' template literals mentally (or `curl localhost:3000/docs/laravel.md` / `.../typescript.md` with the dev server running) to confirm the interpolated constants still produce valid markdown — a stray backtick or `${}` typo in a `docs-content` constant breaks the rendered template silently.
- Start the dev server (`yarn dev`) and actually look at `/`, `/docs/laravel`, `/docs/typescript` in a browser if the change is visual (new feature bullet, new Playground field) — this repo's own convention is to verify UI changes visually, not just by reading JSX.
- Re-read `public/llms.txt` end to end once more: it's consumed by agents, not rendered/compiled by anything, so nothing catches a stale fact in it automatically.
