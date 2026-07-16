import type { Metadata } from 'next'
import { DocsHero, Section, SubHeading } from '@/components/DocsPage'
import { CodeBlock, InlineCode, Link } from '@/components/Prose'
import {
  BROWSER_DOWNLOAD_CODE,
  CLIENT_CODE,
  ENV_CODE,
  MERGE_CODE,
  NODE_API_ROUTE_CODE,
  NODE_SAVE_CODE,
  paramRows,
} from '@/lib/docs-content/typescript'

export const metadata: Metadata = {
  title: 'TypeScript Integration — PDF Generation API',
  description: 'Example TypeScript client (Node & browser) to generate and merge PDFs with the PDF Generation API.',
}

export default function TypeScriptDocs() {
  return (
    <div className="
      min-h-screen bg-white
      dark:bg-black
    "
    >
      <DocsHero
        eyebrow="Framework Integration"
        title="Using pdf-gen from TypeScript"
        subtitle="A dependency-free, fluent client built on the Fetch API — works the same in Node and in the browser."
      />

      <div className="
        mx-auto max-w-7xl px-4 pb-24
        sm:px-6
        lg:px-8
      "
      >
        <div className="space-y-16">
          <Section title="1. Configuration">
            <p>
              The client only needs the URL of your instance. In Node, read it from an environment variable:
            </p>
            <CodeBlock lang="bash">{ENV_CODE}</CodeBlock>
            <p>
              In the browser, there is no process environment, so pass the URL directly (e.g. from a public build-time
              constant such as
              {' '}
              <InlineCode>NEXT_PUBLIC_PDF_GEN_API_URL</InlineCode>
              ).
            </p>
            <p>
              ⚠️ Don't use the demo instance (
              <InlineCode>https://pdf.mathieutu.dev</InlineCode>
              ) in production: it is not versioned and can break without notice.
              {' '}
              <Link href="https://github.com/mathieutu/pdf-gen/fork">Fork the project</Link>
              {' '}
              and deploy your own instance (
              <Link href="https://github.com/mathieutu/pdf-gen#docker">Docker</Link>
              {' '}
              or
              {' '}
              <Link href="https://vercel.com/new/clone">Vercel</Link>
              ).
            </p>
          </Section>

          <Section title="2. The client">
            <p>
              This fluent client builds a
              {' '}
              <InlineCode>POST /api/gen</InlineCode>
              {' '}
              call from raw HTML and/or URLs (web pages, PDFs or images) to merge, using only the built-in
              {' '}
              <InlineCode>fetch</InlineCode>
              {' '}
              API. It runs unchanged in Node (18+), edge runtimes, and browsers.
            </p>
            <CodeBlock lang="ts">{CLIENT_CODE}</CodeBlock>
          </Section>

          <Section title="3. Usage">
            <SubHeading>Node: generate and save to disk</SubHeading>
            <CodeBlock lang="ts">{NODE_SAVE_CODE}</CodeBlock>
            <SubHeading>Node: return the PDF from an API route</SubHeading>
            <CodeBlock lang="ts">{NODE_API_ROUTE_CODE}</CodeBlock>
            <SubHeading>Browser: generate and trigger a download</SubHeading>
            <CodeBlock lang="ts">{BROWSER_DOWNLOAD_CODE}</CodeBlock>
            <SubHeading>Merge an HTML cover page with existing PDFs/URLs</SubHeading>
            <CodeBlock lang="ts">{MERGE_CODE}</CodeBlock>
          </Section>

          <Section title="Parameter reference">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-base">
                <thead>
                  <tr className="
                    border-b border-gray-200
                    dark:border-gray-700
                  "
                  >
                    <th className="
                      py-2 pr-4 font-semibold text-gray-900
                      dark:text-white
                    "
                    >
                      Method
                    </th>
                    <th className="
                      py-2 pr-4 font-semibold text-gray-900
                      dark:text-white
                    "
                    >
                      API field
                    </th>
                    <th className="
                      py-2 font-semibold text-gray-900
                      dark:text-white
                    "
                    >
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paramRows.map(row => (
                    <tr
                      key={row.method}
                      className="
                        border-b border-gray-100
                        dark:border-gray-800
                      "
                    >
                      <td className="py-2 pr-4"><InlineCode>{row.method}</InlineCode></td>
                      <td className="py-2 pr-4"><InlineCode>{row.field}</InlineCode></td>
                      <td className="py-2">{row.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              For direct file uploads (PDF/image/HTML as
              {' '}
              <InlineCode>multipart/form-data</InlineCode>
              , 4 MB max) or page customization (headers, footers, margins, page numbering via
              {' '}
              <InlineCode>pdfOptions</InlineCode>
              ), see the
              {' '}
              <Link href="https://github.com/mathieutu/pdf-gen#post-apigen">multipart form data section</Link>
              {' '}
              of the project's README.
            </p>
          </Section>
        </div>
      </div>
    </div>
  )
}
