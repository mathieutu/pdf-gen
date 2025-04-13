# PDF Generator

A simple API to generate PDFs from URLs or HTML content, powered by Puppeteer and headless Chromium. This project is open-source and serverless deployment ready.

## Features

- ✅ Generate PDFs from URLs or HTML content
- ✅ Powered by Puppeteer and headless Chromium
- ✅ Serverless deployment ready
- ✅ Open source
- 🟠 Customizable page settings (coming soon, open to contributions)

## Get Started


You can try it out on https://pdf.mathieutu.dev.
This URL is provided for demonstration purposes only.

Please deploy it on your own infrastructure, or I'll have to shut it down.
You can do it freely on Vercel [with one click](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmathieutu%2Fpdf-gen).


To generate a PDF, you can make a JSON POST request to the `/api/gen` endpoint with either a `url` or `html` parameter in the request body:

```bash
curl -X POST 'https://your-deployment-url/api/gen' \
  --header 'Content-Type: application/json' \
  --output 'foo.pdf' \
  --data-raw '{
    "filename": "foo.pdf",
    "html": "<html><head><script src=\"https:\/\/cdn.tailwindcss.com\"><\/script><\/head><body class=\"h-screen grid place-items-center\"><span class=\"print:hidden\">IT SHOULD NO BE PRINTED<\/span><div class=\"bg-pink-300 text-pink-800 p-8 h-[100px] grid place-items-center font-medium font-mono\">@mathieutu<\/div><\/body><\/html>"
  }'
```

Alternatively, you can directly pass a URL as a query parameter in a GET request:

```bash
https://your-deployment-url/api/gen?url=https://example.com
```

The response will be a PDF document with the appropriate content type headers.

## The Author

This project was created by [@mathieutu](https://mathieutu.dev), a passionate developer focused on building open-source tools and APIs.

Feel free to contribute to the project or [reach out](mailto:contact@mathieutu.dev) for collaboration opportunities.
