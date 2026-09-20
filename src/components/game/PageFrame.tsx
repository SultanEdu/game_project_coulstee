import { Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { useState } from 'react'

export function PageFrame({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <main className="game-page">
      <header className="game-header">
        <button onClick={() => setShowConfirm(true)} className="back-link"><ChevronLeft size={17} /> Beranda</button>
        <div className="game-header-copy"><h1 className="game-header-title">{title}</h1>{subtitle && <p className="game-header-subtitle">{subtitle}</p>}</div>
      </header>
      <div className="section-divider" />
      <div className="game-surface">{children}</div>
      {showConfirm && (
        <div className="leave-dialog-overlay" onClick={() => setShowConfirm(false)}>
          <div className="leave-dialog" role="dialog" aria-modal="true" aria-labelledby="leave-dialog-title" onClick={(event) => event.stopPropagation()}>
            <h3 id="leave-dialog-title">Kembali ke beranda?</h3>
            <p>Progress permainan akan hilang. Yakin ingin meninggalkan halaman ini?</p>
            <div className="leave-dialog-actions">
              <button onClick={() => setShowConfirm(false)} className="leave-dialog-cancel">Tetap di sini</button>
              <Link to="/" className="leave-dialog-confirm">Ya, kembali</Link>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
