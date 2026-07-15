import type { Metadata } from 'next'
import { DocsHero, Section, SubHeading } from '@/components/DocsPage'
import { CodeBlock, InlineCode, Link } from '@/components/Prose'
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

export const metadata: Metadata = {
  title: 'Laravel Integration — PDF Generation API',
  description: 'Example Laravel service to generate and merge PDFs with the PDF Generation API.',
}

export default function LaravelDocs() {
  return (
    <div className="
      min-h-screen bg-white
      dark:bg-black
    "
    >
      <DocsHero
        eyebrow="Framework Integration"
        title="Using pdf-gen from Laravel"
        subtitle="A fluent, drop-in service to generate and merge PDFs from a Laravel application."
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
              Add the URL of your instance to
              {' '}
              <InlineCode>config/services.php</InlineCode>
              :
            </p>
            <CodeBlock lang="php">{CONFIG_CODE}</CodeBlock>
            <CodeBlock lang="bash">{ENV_CODE}</CodeBlock>
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

          <Section title="2. The service">
            <p>
              This fluent service builds a
              {' '}
              <InlineCode>POST /api/gen</InlineCode>
              {' '}
              call from a Blade view, raw HTML, and/or URLs (web pages, PDFs or images) to merge. It implements
              {' '}
              <InlineCode>Responsable</InlineCode>
              {' '}
              so it can be returned directly from a controller.
            </p>
            <CodeBlock lang="php">{SERVICE_CODE}</CodeBlock>
          </Section>

          <Section title="3. Usage">
            <SubHeading>From a controller (inline response)</SubHeading>
            <CodeBlock lang="php">{CONTROLLER_CODE}</CodeBlock>
            <SubHeading>Forced download</SubHeading>
            <CodeBlock lang="php">{DOWNLOAD_CODE}</CodeBlock>
            <SubHeading>Merge an HTML cover page with existing PDFs/URLs</SubHeading>
            <CodeBlock lang="php">{MERGE_CODE}</CodeBlock>
            <SubHeading>Generate and store outside a controller (job, command...)</SubHeading>
            <CodeBlock lang="php">{JOB_CODE}</CodeBlock>
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
                      <td className="py-2 pr-4">{row.field === '—' ? row.field : <InlineCode>{row.field}</InlineCode>}</td>
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
              , 4 MB max), see the
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
