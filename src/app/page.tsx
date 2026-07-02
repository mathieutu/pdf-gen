import NextLink from 'next/link'
import { Playground } from '@/components/Playground'
import { CodeBlock, InlineCode, Link } from '@/components/Prose'
import { CURL_CODE, EXAMPLE_HTML_URL, EXAMPLE_IMAGE_URL, EXAMPLE_PDF_URL, host } from '@/lib/examples'

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
                    You can
                    {' '}
                    <Link href="https://github.com/mathieutu/pdf-gen/fork">
                      fork the repository on GitHub
                    </Link>
                    {' '}
                    and
                    <Link href="https://vercel.com/new/clone">deploy it to Vercel</Link>
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
                    in the request body (JSON or form data). The HTML content is placed first,
                    followed by the URLs in order. PDF and images URLs are all supported.
                  </p>
                  <CodeBlock lang="bash">{CURL_CODE}</CodeBlock>
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
                  <p>
                    The response is always a PDF document with
                    <InlineCode>Content-Type: application/pdf</InlineCode>
                    .
                  </p>
                  <p>
                    A Docker image is published on
                    {' '}
                    <Link href="https://github.com/mathieutu/pdf-gen/pkgs/container/pdf-gen">GitHub Container Registry</Link>
                    {' '}
                    on every release. Pin the major tag (e.g.
                    {' '}
                    <InlineCode>1</InlineCode>
                    ) to get fixes and new features automatically while staying protected from breaking changes:
                  </p>
                  <CodeBlock lang="bash">docker run -p 3000:3000 ghcr.io/mathieutu/pdf-gen:1</CodeBlock>
                </div>
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
                  Framework Integrations
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
                    <NextLink
                      href="/docs/laravel"
                      className="
                        underline
                        hover:text-blue-800
                        dark:hover:text-blue-300
                      "
                    >
                      Laravel
                    </NextLink>
                    {' '}
                    — example service to generate and merge PDFs from a Laravel app.
                  </p>
                  <p>
                    <NextLink
                      href="/docs/typescript"
                      className="
                        underline
                        hover:text-blue-800
                        dark:hover:text-blue-300
                      "
                    >
                      TypeScript
                    </NextLink>
                    {' '}
                    — fluent client (Node & browser) built on the Fetch API.
                  </p>
                </div>
              </div>
            </div>
          </section>
          <Playground />
        </div>
      </div>
    </div>
  )
}
