export function renderErrorPage(statusCode: 404 | 500 = 500): string {
  const is404 = statusCode === 404;
  const title = is404 ? "404 — Halaman Tidak Ditemukan" : "Halaman Gagal Dimuat";
  const heading = is404 ? "404" : "Kesalahan";
  const message = is404
    ? "Seolah-olah kartu ini hilang dari dek... Alamat yang Anda cari tidak ada."
    : "Terjadi kesalahan tak terduga saat memuat halaman. Silakan coba kembali atau kembali ke beranda.";

  return `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;900&family=Cormorant+Garamond:ital,wght@0,500;0,700;1,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
    <style>
      :root {
        --mahogany-deep: #1f1110;
        --mahogany: #3b1f1c;
        --parchment: #f1e7cf;
        --gold: #d4a64a;
        --gold-bright: #e8c16a;
        --ink: #2a1810;
      }
      * { box-sizing: border-box; }
      body {
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        background: var(--mahogany-deep);
        background-image:
          radial-gradient(at 20% 10%, rgba(59,31,28,0.5) 0%, transparent 55%),
          radial-gradient(at 80% 90%, rgba(37,20,17,0.55) 0%, transparent 60%);
        color: var(--parchment);
        display: grid;
        place-items: center;
        min-height: 100vh;
        margin: 0;
        padding: 1.5rem;
      }
      .card {
        max-width: 30rem;
        width: 100%;
        text-align: center;
        padding: 2.5rem 2rem;
        background: var(--parchment);
        color: var(--ink);
        border-radius: 1rem;
        border: 1px solid rgba(139, 102, 47, 0.45);
        box-shadow: 0 2px 8px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(212,166,74,0.4);
        position: relative;
      }
      .card::before {
        content: "";
        position: absolute;
        inset: 8px;
        border: 1px dashed rgba(120, 90, 50, 0.35);
        border-radius: inherit;
        pointer-events: none;
        opacity: 0.85;
      }
      .big {
        font-family: 'Cinzel', Georgia, serif;
        font-size: ${is404 ? "6rem" : "3rem"};
        line-height: 1;
        color: var(--gold);
        letter-spacing: 0.02em;
        margin: 0 0 1rem;
      }
      .divider {
        height: 1px;
        background: linear-gradient(90deg, transparent, var(--gold), transparent);
        margin: 1rem 0;
      }
      h1 {
        font-family: 'Cinzel', Georgia, serif;
        font-size: 1.5rem;
        margin: 1rem 0 0.5rem;
        color: var(--ink);
        letter-spacing: 0.02em;
      }
      p {
        color: rgba(42,24,16,0.75);
        margin: 0 0 2rem;
        font-family: 'Cormorant Garamond', Georgia, serif;
        font-style: italic;
        font-size: 1.1rem;
        line-height: 1.6;
      }
      .actions { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
      a, button {
        height: 3rem;
        padding: 0 1.5rem;
        border-radius: 0.375rem;
        font-family: 'Cinzel', Georgia, serif;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        font-size: 0.8rem;
        cursor: pointer;
        text-decoration: none;
        border: 2px solid var(--mahogany);
        transition: background 150ms ease, color 150ms ease;
      }
      .primary {
        background: var(--mahogany);
        color: var(--gold);
      }
      .primary:hover { background: var(--mahogany-deep); }
      .secondary {
        background: transparent;
        color: var(--mahogany);
      }
      .secondary:hover { background: var(--mahogany); color: var(--gold); }
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .card { animation: fadeInUp 0.35s ease-out both; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="big">${heading}</div>
      <div class="divider"></div>
      <h1>${title}</h1>
      <p>${message}</p>
      <div class="actions">
        <a class="primary" href="/">Kembali ke Beranda</a>
        <button class="secondary" onclick="history.length > 1 ? history.back() : location.href='/'">Kembali</button>
      </div>
    </div>
  </body>
</html>`;
}
