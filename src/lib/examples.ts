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
export const EXAMPLE_MARGIN = { top: '20mm', bottom: '16mm', left: '14mm', right: '14mm' }
const EXAMPLE_TEMPLATE_FONT = 'Arial, Helvetica, sans-serif'
const EXAMPLE_TEMPLATE_LINK_STYLE = 'color:inherit; text-decoration:underline;'
export const EXAMPLE_HEADER_TEMPLATE = `<div style="font-family:${EXAMPLE_TEMPLATE_FONT}; font-size:8px; width:100%; display:flex; justify-content:space-between; padding:0 ${EXAMPLE_MARGIN.left}; color:#999;"><span>PDF Generation API</span><span><a href="${EXAMPLE_HTML_URL}" style="${EXAMPLE_TEMPLATE_LINK_STYLE}">pdf.mathieutu.dev</a></span></div>`
export const EXAMPLE_FOOTER_TEMPLATE = `<div style="font-family:${EXAMPLE_TEMPLATE_FONT}; font-size:8px; width:100%; display:flex; justify-content:space-between; padding:0 ${EXAMPLE_MARGIN.left}; color:#999;"><span>Mathieu TUDISCO (<a href="https://mathieutu.dev" style="${EXAMPLE_TEMPLATE_LINK_STYLE}">mathieutu.dev</a>)</span><span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`

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
    ],
    "pdfOptions": { "margin": ${JSON.stringify(EXAMPLE_MARGIN)}, "headerTemplate": ${JSON.stringify(EXAMPLE_HEADER_TEMPLATE)}, "footerTemplate": ${JSON.stringify(EXAMPLE_FOOTER_TEMPLATE)} }
  }'`
