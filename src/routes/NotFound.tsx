import { Link, useNavigate } from 'react-router-dom'
import { Home } from 'lucide-react'

function NotFound() {
  const navigate = useNavigate()

  return (
    <main className="min-h-screen px-4 py-10 max-w-xl mx-auto flex flex-col items-center justify-center">
      <div className="parchment-card rounded-2xl p-8 text-center w-full contain-scroll animate-fade-in-up">
        <div className="font-display text-8xl text-gold leading-none mb-2">404</div>
        <div className="gold-divider my-4" />
        <h1 className="font-display text-2xl text-ink mt-4">Halaman Tidak Ditemukan</h1>
        <p className="font-serif-elegant italic text-ink/70 mt-2 leading-relaxed">
          Seolah-olah kartu ini hilang dari dek...<br />
          Alamat yang Anda cari tidak ada dalam catatan kami.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-md bg-mahogany text-gold font-display tracking-wider uppercase text-sm hover:bg-mahogany-deep transition-colors"
          >
            <Home className="h-4 w-4" /> Kembali ke Beranda
          </Link>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-md border-2 border-mahogany text-mahogany font-display tracking-wider uppercase text-sm hover:bg-mahogany hover:text-gold transition-colors"
          >
            Kembali
          </button>
        </div>
      </div>
    </main>
  )
}

export default NotFound
