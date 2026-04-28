'use client'

import { type ComponentProps, useState } from 'react'

const Link = (props: ComponentProps<'a'>) => (
  <a
    className="
      underline
      hover:text-blue-800
      dark:hover:text-blue-300
    "
    target="_blank"
    rel="noopener noreferrer"
    {...props}
  />
)

const CheckIcon = ({ className = '' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    aria-hidden="true"
    className={`
      size-6
      ${className}
    `}
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

const host = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000'

const EXAMPLE_HTML = `<html>
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
const EXAMPLE_HTML_URL = host
const EXAMPLE_IMAGE_URL = 'https://www.troglos.fr/og-image.jpg'
const EXAMPLE_PDF_URL = 'https://pour-un-reveil-ecologique.org/documents/54/10_key_points_IPCC_1_2_and_3.pdf'
const EXAMPLE_FILENAME = 'foo.pdf'

const CurlCode = () => {
  const [copied, setCopied] = useState(false)

  const codeString = `curl -X POST '${host}/api/gen' \\
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

  const copyToClipboard = () => {
    navigator.clipboard.writeText(codeString)
    setCopied(true)
    setTimeout(setCopied, 2000, false)
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-gray-900 shadow-md">
      <button
        onClick={copyToClipboard}
        className="
          absolute top-2 right-2 rounded-sm bg-gray-700 px-2 py-1 text-xs
          text-white
          hover:bg-gray-600
          focus:ring-1 focus:ring-gray-500 focus:outline-none
          print:hidden
        "
        aria-label="Copy code to clipboard"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <pre className="
        overflow-x-auto p-6 text-sm text-white
        sm:px-8
      "
      >
        <code>{codeString}</code>
      </pre>

    </div>
  )
}

const inputCls = `
  w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm
  text-gray-900 shadow-sm placeholder:text-gray-400
  focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none
  dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500
  dark:focus:border-blue-400 dark:focus:ring-blue-400
`

const Playground = () => {
  const [method, setMethod] = useState<'GET' | 'POST'>('POST')
  const [mergeItems, setMergeItems] = useState([EXAMPLE_HTML_URL, EXAMPLE_IMAGE_URL, EXAMPLE_PDF_URL])

  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'

  return (
    <section className='print:hidden'>
      <div className="lg:grid lg:grid-cols-3 lg:gap-8">
        <div>
          <h2 className="
            text-2xl font-extrabold tracking-tight text-gray-900
            sm:text-3xl
            dark:text-white
          "
          >
            Playground
          </h2>
          <p className="
            mt-4 text-base text-gray-500
            dark:text-gray-400
          "
          >
            Try the API directly from your browser.
          </p>
        </div>
        <div className="
          mt-12
          lg:col-span-2 lg:mt-0
        "
        >
          <form
            action="/api/gen"
            method={method}
            target="_blank"
            className="
              space-y-6 rounded-xl border border-gray-200 bg-gray-50 p-6
              dark:border-gray-700 dark:bg-gray-900
            "
          >
            {/* Method */}
            <fieldset>
              <legend className={labelCls}>Method</legend>
              <div className="flex gap-6">
                {(['GET', 'POST'] as const).map(m => (
                  <label
                    key={m}
                    className="
                      flex cursor-pointer items-center gap-2 text-sm
                      text-gray-700
                      dark:text-gray-300
                    "
                  >
                    <input
                      type="radio"
                      name="method"
                      value={m}
                      checked={method === m}
                      onChange={() => setMethod(m)}
                      className="accent-blue-600"
                    />
                    {m}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* HTML — POST only */}
            {method === 'POST' && (
              <div>
                <label className={labelCls}>
                  HTML
                  <span className="ml-1 font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  name="html"
                  defaultValue={EXAMPLE_HTML}
                  placeholder="<html><body>Hello world</body></html>"
                  rows={5}
                  className={`
                    ${inputCls}
                    resize-y font-mono text-xs
                  `}
                />
              </div>
            )}

            {/* URLs */}
            <div>
              <p className={labelCls}>
                URLs
                <span className="ml-1 font-normal text-gray-400">(optional)</span>
              </p>
              <div className="space-y-2">
                {mergeItems.map((item, i) => (
                  <div key={item} className="flex gap-2">
                    <input
                      type="url"
                      name="url"
                      value={item}
                      onChange={e => setMergeItems(curr => curr.map((val, j) => j === i ? e.target.value : val))}
                      placeholder="https://example.com/doc.pdf"
                      className={inputCls}
                    />
                    {mergeItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setMergeItems(curr => curr.filter((_, j) => j !== i))}
                        className="
                          shrink-0 rounded-md border border-gray-300 px-3 py-2
                          text-sm text-gray-600
                          hover:bg-gray-100
                          dark:border-gray-600 dark:text-gray-400
                          dark:hover:bg-gray-800
                        "
                        aria-label="Remove"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setMergeItems([...mergeItems, ''])}
                  className="
                    text-sm text-blue-600
                    hover:underline
                    dark:text-blue-400
                  "
                >
                  + Add URL
                </button>
              </div>
            </div>

            {/* Filename — POST only */}
            {method === 'POST' && (
              <div>
                <label className={labelCls}>Filename</label>
                <input
                  type="text"
                  name="filename"
                  defaultValue={EXAMPLE_FILENAME}
                  placeholder="output.pdf"
                  className={inputCls}
                />
              </div>
            )}

            <button
              type="submit"
              className="
                rounded-md bg-black px-5 py-2.5 text-sm font-bold text-white
                shadow-sm
                hover:opacity-70
                dark:bg-white dark:text-black
              "
            >
              Generate PDF
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}

const InlineCode = ({ children }: { children: React.ReactNode }) => (
  <code
    className="
      rounded-sm bg-gray-100 px-1 py-0.5
      dark:bg-gray-800
    "
  >
    {children}
  </code>
)

export default function Home() {
  return (
    <div className="
      min-h-screen bg-white
      dark:bg-black
    "
    >
      {/* Hero Section */}
      <div className="
        relative px-6 py-24
        sm:py-32
        lg:py-40
      "
      >
        <div className="mx-auto max-w-7xl text-center">
          <h1 className="
            text-4xl font-extrabold tracking-tight text-gray-900
            sm:text-5xl
            md:text-6xl
            dark:text-white
          "
          >
            PDF Generation API
          </h1>
          <p className="
            mx-auto mt-6 max-w-2xl text-xl text-gray-500
            dark:text-gray-400
          "
          >
            A powerful, easy-to-use API for generating PDF documents from HTML content or URLs.
          </p>
          <div className="
            mx-auto mt-10 max-w-sm
            sm:flex sm:max-w-none sm:justify-center
          "
          >
            <div className="
              space-y-4
              sm:mx-auto sm:inline-grid sm:grid-cols-2 sm:gap-5 sm:space-y-0
            "
            >
              <a
                href="https://github.com/mathieutu/pdf-gen/fork"
                className="
                  flex items-center justify-center rounded-md border
                  border-transparent bg-black px-4 py-3 text-base font-bold
                  text-white shadow-sm
                  hover:opacity-70
                "
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="mr-2"
                  aria-hidden="true"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                Fork on GitHub
              </a>
              <a
                href="https://github.com/mathieutu/pdf-gen"
                className="
                  flex items-center justify-center rounded-md border
                  border-gray-300 bg-white px-4 py-3 text-base font-medium
                  text-gray-700
                  hover:bg-gray-50
                  dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300
                  dark:hover:bg-gray-700
                "
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                  className="mr-2"
                >
                  <path
                    d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                  />
                </svg>
                View Repository
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="
        mx-auto max-w-7xl px-4 pb-16
        sm:px-6
        lg:px-8
      "
      >
        <div className="space-y-16">
          <section>
            <div className="lg:grid lg:grid-cols-3 lg:gap-8">
              <div>
                <h2 className="
                  text-2xl font-extrabold tracking-tight text-gray-900
                  sm:text-3xl
                  dark:text-white
                "
                >
                  Features
                </h2>
              </div>
              <div className="
                mt-12
                lg:col-span-2 lg:mt-0
              "
              >
                <ul className="
                  space-y-4 text-lg text-gray-600
                  dark:text-gray-300
                "
                >
                  <li className="flex items-start">
                    <div className="shrink-0">
                      <CheckIcon className="text-green-500" />
                    </div>
                    <p className="ml-3">Generate PDFs from URLs or HTML content</p>
                  </li>
                  <li className="flex items-start">
                    <div className="shrink-0">
                      <CheckIcon className="text-green-500" />
                    </div>
                    <p className="ml-3">Merge multiple PDFs into one (including the one you generated from HTML)</p>
                  </li>
                  <li className="flex items-start">
                    <div className="shrink-0">
                      <CheckIcon className="text-green-500" />
                    </div>
                    <p className="ml-3">Powered by Puppeteer and headless Chromium</p>
                  </li>
                  <li className="flex items-start">
                    <div className="shrink-0">
                      <CheckIcon className="text-green-500" />
                    </div>
                    <p className="ml-3">Serverless deployment ready</p>
                  </li>
                  <li className="flex items-start">
                    <div className="shrink-0">
                      <CheckIcon className="text-green-500" />
                    </div>
                    <p className="ml-3">Open source</p>
                  </li>
                  <li className="flex items-start">
                    <div className="shrink-0">
                      <svg
                        className="size-6 text-orange-500"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="ml-3">Customizable page settings (soon, open to contribution)</p>
                  </li>
                </ul>
              </div>
            </div>
          </section>
          <section>
            <div className="lg:grid lg:grid-cols-3 lg:gap-8">
              <div>
                <h2 className="
                  text-2xl font-extrabold tracking-tight text-gray-900
                  sm:text-3xl
                  dark:text-white
                "
                >
                  Get started
                </h2>
              </div>
              <div className="
                mt-12
                lg:col-span-2 lg:mt-0
              "
              >
                <div className="
                  space-y-6 text-lg text-gray-600
                  dark:text-gray-300
                "
                >
                  <p>
                    This hosted API is provided for demonstration purposes only.
                    {' '}
                    <strong className="font-bold">
                      Please fork the repository and deploy your own instance.
                    </strong>
                  </p>
                  <p>
                    This API is not versioned and breaking changes may occur, even if best effort is made to avoid them.
                    Owning your deployment means you stay in control of updates and stability.
                  </p>
                  <p>
                    You can{' '}
                    <Link href="https://github.com/mathieutu/pdf-gen/fork">
                      fork the repository on GitHub
                    </Link>
                    {' '}and <Link href="https://vercel.com/new/clone">deploy it to Vercel</Link>
                    .
                  </p>
                  <p>
                    To generate a PDF, make a POST request to
                    {' '}
                    <InlineCode>/api/gen</InlineCode>
                    {' '}
                    with
                    {' '}
                    <InlineCode>html</InlineCode>
                    {' '}
                    and/or
                    {' '}
                    <InlineCode>urls</InlineCode>
                    {' '}
                    in the request body (JSON or form data). The HTML content is placed first, followed by the URLs in order. PDF and images URLs are all supported.
                  </p>
                  <CurlCode />
                  <p>
                    You can also directly pass URLs as query parameters in a GET request:
                    {' '}
                    <code>
                      <Link
                        href={`${host}/api/gen?url=${EXAMPLE_HTML_URL}&url=${EXAMPLE_IMAGE_URL}&url=${EXAMPLE_PDF_URL}`}
                      >
                        {`${host}/api/gen?url=${EXAMPLE_HTML_URL}&url=${EXAMPLE_IMAGE_URL}&url=${EXAMPLE_PDF_URL}`}
                      </Link>
                    </code>
                  </p>
                  <p>The response is always a PDF document with <InlineCode>Content-Type: application/pdf</InlineCode>.</p>
                </div>
              </div>
            </div>
          </section>
          <Playground />
          <section>
            <div className="lg:grid lg:grid-cols-3 lg:gap-8">
              <div>
                <h2 className="
                  text-2xl font-extrabold tracking-tight text-gray-900
                  sm:text-3xl
                  dark:text-white
                "
                >
                  The Author
                </h2>
              </div>
              <div className="
                mt-12
                lg:col-span-2 lg:mt-0
              "
              >
                <div className="
                  space-y-6 text-lg text-gray-600
                  dark:text-gray-300
                "
                >
                  <p>
                    This project was created by
                    {' '}
                    <Link href="https://mathieutu.dev">@mathieutu</Link>
                    , a passionate developer focused on building open-source tools and APIs.
                  </p>
                  <p>
                    Feel free to contribute to the project or
                    {' '}
                    <Link href="mailto:contact@mathieutu.dev">
                      reach out
                    </Link>
                    {' '}
                    for collaboration opportunities.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
