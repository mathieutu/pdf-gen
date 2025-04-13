import { UrlGet, CurlCode } from '@/components/clients'
import { Link } from '@/components/common'

const CheckIcon = ({ className = '' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg" fill="none"
    viewBox="0 0 24 24" stroke="currentColor"
    aria-hidden="true"
    className={`h-6 w-6 ${className}`}
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
  </svg>
)



export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Hero Section */}
      <div className="relative py-24 sm:py-32 lg:py-40 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
            PDF Generation API
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-500 dark:text-gray-400">
            A powerful, easy-to-use API for generating PDF documents from HTML content or URLs.
          </p>
          <div className="mt-10 max-w-sm mx-auto sm:max-w-none sm:flex sm:justify-center">
            <div className="space-y-4 sm:space-y-0 sm:mx-auto sm:inline-grid sm:grid-cols-2 sm:gap-5">
              <a
                href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmathieutu%2Fpdf-gen"
                className="flex items-center font-bold justify-center px-4 py-3 border border-transparent text-base rounded-md shadow-sm text-white bg-black hover:opacity-70"
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
                  <path d="M12 2L2 19.5h20L12 2z"/>
                </svg>

                Deploy with Vercel
              </a>
              <a
                href="https://github.com/mathieutu/pdf-gen"
                className="flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-700 text-base font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
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
                    d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                View Repository
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="space-y-16">
          <section>
            <div className="lg:grid lg:grid-cols-3 lg:gap-8">
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight sm:text-3xl">
                  Features
                </h2>
              </div>
              <div className="mt-12 lg:mt-0 lg:col-span-2">
                <ul className="space-y-4 text-lg text-gray-600 dark:text-gray-300">
                  <li className="flex items-start">
                    <div className="flex-shrink-0">
                      <CheckIcon className="text-green-500"/>
                    </div>
                    <p className="ml-3">Generate PDFs from URLs or HTML content</p>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0">
                      <CheckIcon className="text-green-500"/>
                    </div>
                    <p className="ml-3">Powered by Puppeteer and headless Chromium</p>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0">
                      <CheckIcon className="text-green-500"/>
                    </div>
                    <p className="ml-3">Serverless deployment ready</p>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0">
                      <CheckIcon className="text-green-500"/>
                    </div>
                    <p className="ml-3">Open source</p>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none"
                           viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
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
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight sm:text-3xl">
                  Get started
                </h2>
              </div>
              <div className="mt-12 lg:mt-0 lg:col-span-2">
                <div className="text-lg space-y-6 text-gray-600 dark:text-gray-300">
                  <p>
                    This API is provided for demonstration purposes only. Please deploy it on your own infrastructure,
                    or I&#39;ll have to shut it down.
                  </p>
                  <p>
                    You can deploy it freely to Vercel <Link
                      href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmathieutu%2Fpdf-gen"
                    >with one click</Link>.
                  </p>
                  <p>
                    To generate a PDF, you can make a JSON POST request to the <code
                    className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">/api/gen</code> endpoint with either
                    a <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">url</code> or <code
                    className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">html</code> parameter in the request
                    body:
                  </p>
                  <CurlCode/>
                  <p>
                    You can also directly pass a url in query parameter of a GET request: <code><UrlGet/></code>
                  </p>
                  <p>The response will be a PDF document with the appropriate content type headers.</p>
                </div>
              </div>
            </div>
          </section>
          <section>
            <div className="lg:grid lg:grid-cols-3 lg:gap-8">
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight sm:text-3xl">
                  The Author
                </h2>
              </div>
              <div className="mt-12 lg:mt-0 lg:col-span-2">
                <div className="text-lg space-y-6 text-gray-600 dark:text-gray-300">
                  <p>
                    This project was created by <Link href="https://mathieutu.dev">@mathieutu</Link>, a passionate developer
                    focused on building open-source tools and APIs.
                  </p>
                  <p>
                    Feel free to contribute to the project or <Link href={`mailto:contact@mathieutu.dev`}>reach out</Link> for
                    collaboration opportunities.
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
