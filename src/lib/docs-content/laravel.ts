export const CONFIG_CODE = `// config/services.php
'pdf' => [
    'api_url' => env('PDF_GEN_API_URL', 'http://localhost:3000/api/gen'),
],`

export const ENV_CODE = `# .env
PDF_GEN_API_URL=https://pdf.your-domain.dev/api/gen`

export const SERVICE_CODE = `<?php

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

export const CONTROLLER_CODE = `use App\\Services\\PdfGenerator;

class InvoiceController extends Controller
{
    public function show(Invoice $invoice, PdfGenerator $pdf)
    {
        return $pdf->view('invoices.pdf', ['invoice' => $invoice])
            ->filename("facture-{$invoice->number}.pdf")
            ->inlineResponse();
    }
}`

export const DOWNLOAD_CODE = `return $pdf->view('invoices.pdf', ['invoice' => $invoice])
    ->downloadResponse("invoice-{$invoice->number}.pdf");`

export const MERGE_CODE = `return $pdf->view('invoices.cover', ['invoice' => $invoice])
    ->urls($invoice->attachments->pluck('url'))
    ->downloadResponse('full-file.pdf');`

export const JOB_CODE = `$path = app(PdfGenerator::class)
    ->view('reports.monthly', ['report' => $report])
    ->save('reports', disk: 's3');`

export const paramRows = [
  { method: 'view($view, $data)', field: 'html', description: 'Renders a Blade view to HTML' },
  { method: 'html($html)', field: 'html', description: 'Raw HTML content' },
  { method: 'url($url) / urls($urls)', field: 'urls', description: 'A page, PDF or image URL, merged in the order it was added' },
  { method: 'filename($name)', field: '—', description: 'File name used for the HTTP response or save()' },
]
