import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { Home, RotateCcw } from "lucide-react";

function NotFoundComponent() {
  return (
    <main className="min-h-screen px-4 py-10 max-w-xl mx-auto flex flex-col items-center justify-center">
      <div className="parchment-card rounded-2xl p-8 text-center w-full contain-scroll animate-fade-in-up">
        <div className="font-display text-8xl text-gold leading-none mb-2">404</div>
        <div className="gold-divider my-4" />
        <h1 className="font-display text-2xl text-ink mt-4">Halaman Tidak Ditemukan</h1>
        <p className="font-serif-elegant italic text-ink/70 mt-2 leading-relaxed">
          Seolah-olah kartu ini hilang dari dek...<br />
          Alamat yang Anda cari tidak ada.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-md bg-mahogany text-gold font-display tracking-wider uppercase text-sm hover:bg-mahogany-deep transition-colors"
          >
            <Home className="h-4 w-4" /> Kembali ke Beranda
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-md border-2 border-mahogany text-mahogany font-display tracking-wider uppercase text-sm hover:bg-mahogany hover:text-gold transition-colors"
          >
            Kembali
          </button>
        </div>
      </div>
    </main>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <main className="min-h-screen px-4 py-10 max-w-xl mx-auto flex flex-col items-center justify-center">
      <div className="parchment-card rounded-2xl p-8 text-center w-full contain-scroll animate-fade-in-up">
        <div className="font-display text-5xl text-gold leading-none mb-2">!</div>
        <div className="gold-divider my-4" />
        <h1 className="font-display text-2xl text-ink mt-4">Halaman Gagal Dimuat</h1>
        <p className="font-serif-elegant italic text-ink/70 mt-2 leading-relaxed">
          Ada gangguan di meja permainan.<br />
          Silakan coba kembali atau pindah ke beranda.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-md bg-mahogany text-gold font-display tracking-wider uppercase text-sm hover:bg-mahogany-deep transition-colors"
          >
            <RotateCcw className="h-4 w-4" /> Coba Lagi
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-md border-2 border-mahogany text-mahogany font-display tracking-wider uppercase text-sm hover:bg-mahogany hover:text-gold transition-colors"
          >
            <Home className="h-4 w-4" /> Kembali ke Beranda
          </Link>
        </div>
      </div>
    </main>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Lovable App" },
      { name: "description", content: "Lovable Generated Project" },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Lovable App" },
      { property: "og:description", content: "Lovable Generated Project" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossorigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;900&family=Cormorant+Garamond:ital,wght@0,500;0,700;1,500&family=Inter:wght@400;500;600&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
