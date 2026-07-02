import NextLink from 'next/link'

export const DocsHero = ({ eyebrow, title, subtitle }: { eyebrow: string, title: string, subtitle: string }) => (
  <div className="
    relative px-6 py-16
    sm:py-24
  "
  >
    <div className="mx-auto max-w-7xl">
      <NextLink
        href="/"
        className="
          inline-flex items-center gap-1 text-sm font-medium text-gray-500
          hover:text-gray-900
          dark:text-gray-400
          dark:hover:text-white
        "
      >
        ← Back to home
      </NextLink>
      <p className="
        mt-6 text-sm font-medium text-blue-600
        dark:text-blue-400
      "
      >
        {eyebrow}
      </p>
      <h1 className="
        mt-2 text-4xl font-extrabold tracking-tight text-gray-900
        sm:text-5xl
        dark:text-white
      "
      >
        {title}
      </h1>
      <p className="
        mt-6 max-w-2xl text-xl text-gray-500
        dark:text-gray-400
      "
      >
        {subtitle}
      </p>
    </div>
  </div>
)

const proseCls = `
  space-y-6 text-lg text-gray-600
  dark:text-gray-300
`

export const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <section>
    <div className="lg:grid lg:grid-cols-3 lg:gap-8">
      <div>
        <h2 className="
          text-2xl font-extrabold tracking-tight text-gray-900
          sm:text-3xl
          dark:text-white
        "
        >
          {title}
        </h2>
      </div>
      <div className="
        mt-12
        lg:col-span-2 lg:mt-0
      "
      >
        <div className={proseCls}>{children}</div>
      </div>
    </div>
  </section>
)

export const SubHeading = ({ children }: { children: React.ReactNode }) => (
  <p>
    <strong className="
      font-bold text-gray-900
      dark:text-white
    "
    >
      {children}
    </strong>
  </p>
)
