import {
  CONFIG_CODE,
  CONTROLLER_CODE,
  DOWNLOAD_CODE,
  ENV_CODE,
  JOB_CODE,
  MERGE_CODE,
  paramRows,
  SERVICE_CODE,
} from '@/lib/docs-content/laravel'

const paramsTable = ['| Method | API field | Description |', '| --- | --- | --- |']
  .concat(paramRows.map(row => `| \`${row.method}\` | ${row.field === '—' ? row.field : `\`${row.field}\``} | ${row.description} |`))
  .join('\n')

const body = `# Using pdf-gen from Laravel

A fluent, drop-in service to generate and merge PDFs from a Laravel application.

## 1. Configuration

Add the URL of your instance to \`config/services.php\`:

\`\`\`php
${CONFIG_CODE}
\`\`\`

\`\`\`bash
${ENV_CODE}
\`\`\`

⚠️ Don't use the demo instance (\`https://pdf.mathieutu.dev\`) in production: it is not versioned and can break without notice. [Fork the project](https://github.com/mathieutu/pdf-gen/fork) and deploy your own instance ([Docker](https://github.com/mathieutu/pdf-gen#docker) or [Vercel](https://vercel.com/new/clone)).

## 2. The service

This fluent service builds a \`POST /api/gen\` call from a Blade view, raw HTML, and/or URLs (web pages, PDFs or images) to merge. It implements \`Responsable\` so it can be returned directly from a controller.

\`\`\`php
${SERVICE_CODE}
\`\`\`

## 3. Usage

### From a controller (inline response)

\`\`\`php
${CONTROLLER_CODE}
\`\`\`

### Forced download

\`\`\`php
${DOWNLOAD_CODE}
\`\`\`

### Merge an HTML cover page with existing PDFs/URLs

\`\`\`php
${MERGE_CODE}
\`\`\`

### Generate and store outside a controller (job, command...)

\`\`\`php
${JOB_CODE}
\`\`\`

## Parameter reference

${paramsTable}

For direct file uploads (PDF/image/HTML as \`multipart/form-data\`, 4 MB max) or page customization (headers, footers, margins, page size/orientation, page numbering via \`pdfOptions\`), see the [multipart form data section](https://github.com/mathieutu/pdf-gen#post-apigen) of the project's README, or [/llms.txt](/llms.txt) for the full API reference.
`

export const GET = () => new Response(body, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } })
