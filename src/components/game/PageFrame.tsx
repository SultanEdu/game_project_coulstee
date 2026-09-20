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
      {showConfirm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#152235]/40 p-4 animate-fade-in" onClick={() => setShowConfirm(false)}><div className="w-full max-w-sm rounded-2xl border border-[var(--line)] bg-white p-6 shadow-2xl animate-scale-in" onClick={(event) => event.stopPropagation()}><div className="space-y-4 text-center"><h3 className="font-display text-xl">Kembali ke beranda?</h3><p className="text-sm leading-relaxed text-[var(--ink-soft)]">Progress permainan akan hilang. Yakin ingin meninggalkan halaman ini?</p><div className="flex gap-3 pt-2"><button onClick={() => setShowConfirm(false)} className="game-action game-action-secondary">Batal</button><Link to="/" className="game-action flex items-center justify-center">Ya, kembali</Link></div></div></div></div>}
    </main>
  )
}
