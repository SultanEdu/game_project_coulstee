import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export function PageFrame({
  title, subtitle, children,
}: { title: string; subtitle?: string; children: React.ReactNode }) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen px-4 py-6 max-w-xl mx-auto"
    >
      <header className="flex items-center justify-between mb-4">
        <button 
          onClick={() => setShowConfirm(true)}
          className="inline-flex items-center gap-1 text-gold text-sm font-sans hover:text-gold-bright transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Beranda
        </button>
        <div className="text-right">
          <h1 className="font-display text-gold text-xl tracking-widest">{title}</h1>
          {subtitle && <p className="text-xs text-foreground/60 italic">{subtitle}</p>}
        </div>
      </header>
      <div className="gold-divider mb-6" />
      {children}

      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="parchment-card rounded-xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center space-y-4">
                <h3 className="font-display text-xl text-ink">Kembali ke Beranda?</h3>
                <p className="text-sm text-ink/70 leading-relaxed">
                  Progress permainan akan hilang. Yakin ingin meninggalkan halaman ini?
                </p>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 h-10 rounded border-2 border-mahogany text-mahogany font-display text-sm hover:bg-mahogany hover:text-gold transition-colors"
                  >
                    Batal
                  </button>
                  <Link
                    to="/"
                    className="flex-1 h-10 rounded bg-mahogany text-gold font-display text-sm flex items-center justify-center hover:bg-mahogany-deep transition-colors"
                  >
                    Ya, Kembali
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}