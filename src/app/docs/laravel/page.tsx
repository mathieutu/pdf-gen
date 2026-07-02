import type { Metadata } from 'next'
import { DocsHero, Section, SubHeading } from '@/components/DocsPage'
import { CodeBlock, InlineCode, Link } from '@/components/Prose'

export const metadata: Metadata = {
  title: 'Laravel Integration — PDF Generation API',
  description: 'Example Laravel service to generate and merge PDFs with the PDF Generation API.',
}

const CONFIG_CODE = `// config/services.php
'pdf' => [
    'api_url' => env('PDF_GEN_API_URL', 'http://localhost:3000/api/gen'),
],`

const ENV_CODE = `# .env
PDF_GEN_API_URL=https://pdf.your-domain.dev/api/gen`

const SERVICE_CODE = `<?php

declare(strict_types=1);

namespace App\\Services;

use Illuminate\\Contracts\\Support\\Responsable;
use Illuminate\\Http\\Response;
use Illuminate\\Support\\Facades\\Http;
use Illuminate\\Support\\Facades\\Storage;
use Illuminate\\Support\\Str;
use RuntimeException;

class PdfGenerator implements Responsable
{
    private readonly string $apiUrl;

    private ?string $html = null;

    /** @var string[] Pages, PDF or image URLs, merged after the HTML in this order */
    private array $urls = [];

    private ?string $filename = null;

    private string $document;

    public function __construct()
    {
        $this->apiUrl = config('services.pdf.api_url');
    }

    public function view(string $view, array $data = []): self
    {
        return $this->html(view($view, $data)->render());
    }

    public function html(string $html): self
    {
        $this->html = $html;

        return $this;
    }

    public function url(string $url): self
    {
        $this->urls[] = $url;

        return $this;
    }

    /** @param iterable<string> $urls */
    public function urls(iterable $urls): self
    {
        foreach ($urls as $url) {
            $this->url($url);
        }

        return $this;
    }

    public function filename(string $filename): self
    {
        $this->filename = $filename;

        return $this;
    }

    public function getDocument(): string
    {
        if (! isset($this->document)) {
            $response = Http::asJson()->post($this->apiUrl, array_filter([
                'html' => $this->html,
                'urls' => $this->urls,
            ]));

            if ($response->failed()) {
                throw new RuntimeException("Failed to generate PDF: {$response->body()}");
            }

            $this->document = $response->body();
        }

        return $this->document;
    }

    public function inlineResponse(?string $filename = null): Response
    {
        return $this->toHttpResponse('inline', $filename);
    }

    public function downloadResponse(?string $filename = null): Response
    {
        return $this->toHttpResponse('attachment', $filename);
    }

    public function save(string $path, ?string $filename = null, ?string $disk = null): string
    {
        $path = mb_rtrim($path, '/').'/'.($filename ?? $this->filename ?? Str::random(40).'.pdf');

        Storage::disk($disk)->put($path, $this->getDocument());

        return $path;
    }

    public function toResponse($request): Response
    {
        return $this->inlineResponse();
    }

    private function toHttpResponse(string $disposition, ?string $filename): Response
    {
        $filename ??= $this->filename ?? 'document.pdf';

        return new Response($this->getDocument(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "{$disposition}; filename=\\"{$filename}\\"",
        ]);
    }
}`

const CONTROLLER_CODE = `use App\\Services\\PdfGenerator;

class InvoiceController extends Controller
{
    public function show(Invoice $invoice, PdfGenerator $pdf)
    {
        return $pdf->view('invoices.pdf', ['invoice' => $invoice])
            ->filename("facture-{$invoice->number}.pdf")
            ->inlineResponse();
    }
}`

const DOWNLOAD_CODE = `return $pdf->view('invoices.pdf', ['invoice' => $invoice])
    ->downloadResponse("invoice-{$invoice->number}.pdf");`

const MERGE_CODE = `return $pdf->view('invoices.cover', ['invoice' => $invoice])
    ->urls($invoice->attachments->pluck('url'))
    ->downloadResponse('full-file.pdf');`

const JOB_CODE = `$path = app(PdfGenerator::class)
    ->view('reports.monthly', ['report' => $report])
    ->save('reports', disk: 's3');`

const paramRows = [
  { method: 'view($view, $data)', field: 'html', description: 'Renders a Blade view to HTML' },
  { method: 'html($html)', field: 'html', description: 'Raw HTML content' },
  { method: 'url($url) / urls($urls)', field: 'urls', description: 'A page, PDF or image URL, merged in the order it was added' },
  { method: 'filename($name)', field: '—', description: 'File name used for the HTTP response or save()' },
]

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
