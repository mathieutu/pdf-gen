export const ENV_CODE = `# .env
PDF_GEN_API_URL=https://pdf.your-domain.dev/api/gen`

export const CLIENT_CODE = `export class PdfGenerator {
  #html?: string
  #urls: string[] = []
  #filename?: string

  constructor(private readonly apiUrl: string) {}

  html(html: string): this {
    this.#html = html

    return this
  }

  url(url: string): this {
    this.#urls.push(url)

    return this
  }

  urls(urls: Iterable<string>): this {
    for (const url of urls) this.url(url)

    return this
  }

  filename(filename: string): this {
    this.#filename = filename

    return this
  }

  async generate(): Promise<ArrayBuffer> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html: this.#html,
        urls: this.#urls,
        filename: this.#filename,
      }),
    })

    if (!response.ok) {
      throw new Error(\`Failed to generate PDF: \${await response.text()}\`)
    }

    return response.arrayBuffer()
  }
}`

export const NODE_SAVE_CODE = `import { writeFile } from 'node:fs/promises'
import { PdfGenerator } from './pdf-generator'

const pdf = new PdfGenerator(process.env.PDF_GEN_API_URL!)

const buffer = await pdf
  .html('<h1>Invoice #42</h1>')
  .filename('invoice-42.pdf')
  .generate()

await writeFile('invoice-42.pdf', Buffer.from(buffer))`

export const NODE_API_ROUTE_CODE = `// e.g. a Next.js API route or an Express handler
import { PdfGenerator } from './pdf-generator'

export async function GET() {
  const buffer = await new PdfGenerator(process.env.PDF_GEN_API_URL!)
    .url('https://example.com/report')
    .generate()

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="report.pdf"',
    },
  })
}`

export const BROWSER_DOWNLOAD_CODE = `import { PdfGenerator } from './pdf-generator'

const pdf = new PdfGenerator('https://pdf.your-domain.dev/api/gen')

async function downloadInvoice(html: string) {
  const buffer = await pdf.html(html).filename('invoice.pdf').generate()

  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }))
  const link = Object.assign(document.createElement('a'), { href: url, download: 'invoice.pdf' })
  link.click()
  URL.revokeObjectURL(url)
}`

export const MERGE_CODE = `const buffer = await new PdfGenerator(apiUrl)
  .html('<h1>Cover page</h1>')
  .urls(attachments.map(a => a.url))
  .generate()`

export const paramRows = [
  { method: 'html(html)', field: 'html', description: 'Raw HTML content' },
  { method: 'url(url) / urls(urls)', field: 'urls', description: 'A page, PDF or image URL, merged in the order it was added' },
  { method: 'filename(name)', field: 'filename', description: 'File name attached to the generated document' },
]
