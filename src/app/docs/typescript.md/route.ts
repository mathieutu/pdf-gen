import {
  BROWSER_DOWNLOAD_CODE,
  CLIENT_CODE,
  ENV_CODE,
  MERGE_CODE,
  NODE_API_ROUTE_CODE,
  NODE_SAVE_CODE,
  paramRows,
} from '@/lib/docs-content/typescript'

const paramsTable = ['| Method | API field | Description |', '| --- | --- | --- |']
  .concat(paramRows.map(row => `| \`${row.method}\` | \`${row.field}\` | ${row.description} |`))
  .join('\n')

const body = `# Using pdf-gen from TypeScript

A dependency-free, fluent client built on the Fetch API — works the same in Node and in the browser.

## 1. Configuration

The client only needs the URL of your instance. In Node, read it from an environment variable:

\`\`\`bash
${ENV_CODE}
\`\`\`

In the browser, there is no process environment, so pass the URL directly (e.g. from a public build-time constant such as \`NEXT_PUBLIC_PDF_GEN_API_URL\`).

⚠️ Don't use the demo instance (\`https://pdf.mathieutu.dev\`) in production: it is not versioned and can break without notice. [Fork the project](https://github.com/mathieutu/pdf-gen/fork) and deploy your own instance ([Docker](https://github.com/mathieutu/pdf-gen#docker) or [Vercel](https://vercel.com/new/clone)).

## 2. The client

This fluent client builds a \`POST /api/gen\` call from raw HTML and/or URLs (web pages, PDFs or images) to merge, using only the built-in \`fetch\` API. It runs unchanged in Node (18+), edge runtimes, and browsers.

\`\`\`ts
${CLIENT_CODE}
\`\`\`

## 3. Usage

### Node: generate and save to disk

\`\`\`ts
${NODE_SAVE_CODE}
\`\`\`

### Node: return the PDF from an API route

\`\`\`ts
${NODE_API_ROUTE_CODE}
\`\`\`

### Browser: generate and trigger a download

\`\`\`ts
${BROWSER_DOWNLOAD_CODE}
\`\`\`

### Merge an HTML cover page with existing PDFs/URLs

\`\`\`ts
${MERGE_CODE}
\`\`\`

## Parameter reference

${paramsTable}

For direct file uploads (PDF/image/HTML as \`multipart/form-data\`, 4 MB max) or page customization (headers, footers, margins, page size/orientation, page numbering via \`pdfOptions\`), see the [multipart form data section](https://github.com/mathieutu/pdf-gen#post-apigen) of the project's README, or [/llms.txt](/llms.txt) for the full API reference.
`

export const GET = () => new Response(body, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } })
