# PDF Generator

A simple API to generate PDFs from URLs, HTML content, or uploaded files, powered by Puppeteer and headless Chromium. This project is open-source and serverless deployment ready.

## Features

- ✅ Generate PDFs from URLs, raw HTML content, uploaded files, or data URLs
- ✅ Merge multiple PDFs/pages/images into a single PDF document
- ✅ Powered by Puppeteer and headless Chromium
- ✅ Serverless deployment ready
- ✅ Open source
- 🟠 Customizable page settings (coming soon, open to contributions)

## Get Started

You can try it out on https://pdf.mathieutu.dev.
This URL is provided for demonstration purposes only.

**Please fork the repository and deploy your own instance.** This API is not versioned and breaking changes may occur, even if best effort is made to avoid them. Owning your deployment means you stay in control of updates and stability.

You can [fork the repository on GitHub](https://github.com/mathieutu/pdf-gen/fork) and [deploy it to Vercel](https://vercel.com/new/clone).

### Docker

A Docker image is published on [GitHub Container Registry](https://github.com/mathieutu/pdf-gen/pkgs/container/pdf-gen) on every release.

```bash
docker run -p 3000:3000 ghcr.io/mathieutu/pdf-gen:1
```

Available tags:

| Tag      | Description                                                                |
| -------- | -------------------------------------------------------------------------- |
| `latest` | Latest release on the `main` branch                                        |
| `1`      | Latest `1.x.x` release. Safe to track for updates without breaking changes |
| `1.2`    | Latest `1.2.x` patch release                                               |
| `1.2.3`  | Exact release version                                                      |

Following [SemVer](https://semver.org), pinning the major tag (e.g. `1`) lets you receive fixes and new features automatically while staying protected from breaking changes.

### POST `/api/gen`

Accepts JSON or multipart form data. At least one of `html`, `urls`, or `files` must be provided.

| Parameter  | Type       | Description                                                                                                                                                              |
| ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `html`     | `string`   | Raw HTML content to render                                                                                                                                               |
| `urls`     | `string[]` | List of page, PDF, or image URLs to include, or data URLs (`data:application/pdf;base64,...`, `data:image/...`). Also accepts repeated fields in form data. Alias: `url` |
| `files`    | `File[]`   | PDF, image, or HTML files to upload directly, 4 MB max per file (multipart form data only). Alias: `file`                                                                |
| `filename` | `string`   | Name of the downloaded file (default: `output.pdf`)                                                                                                                      |

`html`, `urls`/`url`, and `files`/`file` are interchangeable ways of listing items to merge — the API infers what each item is from its value, not from which field it was sent under. For JSON bodies and the `GET` endpoint, items are always merged in the fixed order `urls` → `files` → `html`, regardless of the order they're written in the request — HTML therefore always ends up last when mixed with other items. For multipart form data, items are merged in the literal order the fields were submitted.

```bash
curl -X POST 'https://your-deployment-url/api/gen' \
  --header 'Content-Type: application/json' \
  --output 'foo.pdf' \
  --data-raw '{
    "filename": "foo.pdf",
    "html": "<html><head><script src=\"https:\/\/cdn.tailwindcss.com\"><\/script><\/head><body class=\"h-screen grid place-items-center\"><span class=\"print:hidden\">IT SHOULD NO BE PRINTED<\/span><div class=\"bg-pink-300 text-pink-800 p-8 h-[100px] grid place-items-center font-medium font-mono\">@mathieutu<\/div><\/body><\/html>",
    "urls": [
      "https://pour-un-reveil-ecologique.org/documents/54/10_key_points_IPCC_1_2_and_3.pdf"
    ]
  }'
```

Form data is also accepted:

```bash
curl -X POST 'https://your-deployment-url/api/gen' \
  --output 'foo.pdf' \
  --form 'filename=foo.pdf' \
  --form 'html=<html><body>Hello</body></html>' \
  --form 'url=https://example.com' \
  --form 'url=https://example.com/another.pdf'
```

### GET `/api/gen`

Pass one or more URLs as repeated `urls` (or `url`) query parameters. At least one must be provided.

```bash
https://your-deployment-url/api/gen?url=https://example.com?url=https://example.com/another.pdf?url=https://example.com/yet-another.pdf
```

### Image URLs

URLs pointing to image files (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.bmp`, `.svg`) are handled, and consecutive image URLs are rendered together one after another.

The response is always a single merged PDF document with `Content-Type: application/pdf`, whatever the mix or number of inputs. Errors are returned in JSON format (`{ "error": string }`) with an appropriate HTTP status code (`400` invalid/missing input, `413` uploaded file over 4 MB, `500` generation failure).

## Framework Integrations

- [Laravel](https://pdf.mathieutu.dev/docs/laravel) — example service to generate and merge PDFs from a Laravel app
- [TypeScript](https://pdf.mathieutu.dev/docs/typescript) — fluent client (Node & browser) built on the Fetch API

## For AI Agents

If you are an AI agent integrating with this API, read [`/llms.txt`](https://pdf.mathieutu.dev/llms.txt) first — it documents the API and gives explicit integration guidance (notably: never hardcode the demo URL in code you generate for a user). Markdown versions of the framework integration guides are also available at `/docs/laravel.md` and `/docs/typescript.md`.

## The Author

This project was created by [@mathieutu](https://mathieutu.dev), a passionate developer focused on building open-source tools and APIs.

Feel free to contribute to the project or [reach out](mailto:contact@mathieutu.dev) for collaboration opportunities.
