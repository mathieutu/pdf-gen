# PDF Generator

A simple API to generate PDFs from URLs or HTML content, powered by Puppeteer and headless Chromium. This project is open-source and serverless deployment ready.

## Features

- ✅ Generate PDFs from URLs or HTML content
- ✅ Merge multiple PDFs/pages into one (HTML first, then URLs in order)
- ✅ Powered by Puppeteer and headless Chromium
- ✅ Serverless deployment ready
- ✅ Open source
- 🟠 Customizable page settings (coming soon, open to contributions)

## Get Started

You can try it out on https://pdf.mathieutu.dev.
This URL is provided for demonstration purposes only.

**Please fork the repository and deploy your own instance.** This API is not versioned and breaking changes may occur, even if best effort is made to avoid them. Owning your deployment means you stay in control of updates and stability.

You can [fork the repository on GitHub](https://github.com/mathieutu/pdf-gen/fork) and [deploy it to Vercel](https://vercel.com/new/clone).

### POST `/api/gen`

Accepts JSON or multipart form data. Either `html` or `urls` (or both) must be provided. The HTML content (if provided) is placed first, followed by the URLs in their original order.

| Parameter  | Type             | Description                                                       |
|------------|------------------|-------------------------------------------------------------------|
| `html`     | `string`         | Raw HTML content to render as the first page(s)                   |
| `urls`     | `string[]`       | List of page or PDF URLs to include (also accepts repeated fields in form data). Alias: `url` |
| `filename` | `string`         | Name of the downloaded file (default: `output.pdf`)              |

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

The response is always a PDF document with `Content-Type: application/pdf`. Errors are returned in JSON format with an appropriate HTTP status code.

## The Author

This project was created by [@mathieutu](https://mathieutu.dev), a passionate developer focused on building open-source tools and APIs.

Feel free to contribute to the project or [reach out](mailto:contact@mathieutu.dev) for collaboration opportunities.
