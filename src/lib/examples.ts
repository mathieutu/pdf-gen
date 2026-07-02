export const host = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000'

export const EXAMPLE_HTML = `<html>
  <head>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="h-screen grid place-items-center">
    <span class="print:hidden">IT SHOULD NOT BE PRINTED</span>
    <div class="bg-pink-300 text-pink-800 p-8 h-25 grid place-items-center font-medium font-mono">
      @mathieutu
    </div>
  </body>
</html>`
export const EXAMPLE_HTML_URL = 'https://pdf.mathieutu.dev'
export const EXAMPLE_IMAGE_URL = 'https://www.troglos.fr/og-image.jpg'
export const EXAMPLE_PDF_URL = 'https://pour-un-reveil-ecologique.org/documents/54/10_key_points_IPCC_1_2_and_3.pdf'
export const EXAMPLE_FILENAME = 'foo.pdf'

export const CURL_CODE = `curl -X POST '${host}/api/gen' \\
  --header 'Content-Type: application/json' \\
  --output '${EXAMPLE_FILENAME}' \\
  --data-raw '{
    "filename": "${EXAMPLE_FILENAME}",
    "html": ${JSON.stringify(EXAMPLE_HTML.replace(/\n/g, '').replaceAll('  ', ''))},
    "urls": [
      "${EXAMPLE_HTML_URL}",
      "${EXAMPLE_IMAGE_URL}",
      "${EXAMPLE_PDF_URL}"
    ]
  }'`
