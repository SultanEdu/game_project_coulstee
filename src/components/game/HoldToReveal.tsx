import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { vibrate } from "@/lib/game/audio";

export function HoldToReveal({
  children,
  duration = 800,
  label = "Tekan & Tahan untuk Lihat",
}: {
  children: React.ReactNode;
  duration?: number;
  label?: string;
}) {
  const [progress, setProgress] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const tick = () => {
    if (startRef.current == null) return;
    const p = Math.min(1, (performance.now() - startRef.current) / duration);
    setProgress(p);
    if (p >= 1) { setRevealed(true); vibrate(80); return; }
    rafRef.current = requestAnimationFrame(tick);
  };

  const begin = () => {
    if (revealed) return;
    startRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  };
  const end = () => {
    startRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (!revealed) setProgress(0);
  };

  return (
    <div className="w-full flex flex-col items-center gap-6">
      <div className="relative w-full min-h-[180px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          {revealed ? (
            <motion.div
              key="r"
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full"
            >
              {children}
            </motion.div>
          ) : (
            <motion.div
              key="h"
              className="w-full text-center font-serif-elegant italic text-foreground/70"
              style={{ filter: `blur(${10 - progress * 10}px)` }}
            >
              <div className="text-2xl">••• Rahasia •••</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!revealed && (
        <button
          onPointerDown={begin}
          onPointerUp={end}
          onPointerLeave={end}
          onPointerCancel={end}
          className="relative overflow-hidden select-none w-full max-w-xs h-14 rounded-md gold-frame bg-mahogany text-gold font-display tracking-wider uppercase text-sm"
        >
          <div
            className="absolute inset-0 bg-gold/30 origin-left"
            style={{ transform: `scaleX(${progress})` }}
          />
          <span className="relative">{label}</span>
        </button>
      )}
    </div>
  );
}