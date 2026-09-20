import { useRef, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  const [revealed, setRevealed] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);

  const tick = () => {
    if (startRef.current == null) return;
    const p = Math.min(1, (performance.now() - startRef.current) / duration);

    if (progressRef.current) {
      progressRef.current.style.transform = `scaleX(${p})`;
    }

    if (textRef.current) {
      const clarity = Math.min(1, p * 1.2);
      textRef.current.style.filter = `blur(${(1 - clarity) * 6}px)`;
      textRef.current.style.opacity = `${0.7 + clarity * 0.3}`;
    }

    if (p >= 1) {
      setRevealed(true);
      vibrate(80);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  const begin = () => {
    if (revealed) return;
    startRef.current = performance.now();
    setIsHolding(true);
    rafRef.current = requestAnimationFrame(tick);
  };

  const end = () => {
    startRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setIsHolding(false);
    if (!revealed) {
      if (progressRef.current) {
        progressRef.current.style.transform = "scaleX(0)";
      }
      if (textRef.current) {
        textRef.current.style.filter = "blur(6px)";
        textRef.current.style.opacity = "0.7";
      }
    }
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="relative flex min-h-[180px] w-full items-center justify-center">
        <AnimatePresence mode="wait">
          {revealed ? (
            <motion.div
              key="r"
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45 }}
              className="w-full"
            >
              {children}
            </motion.div>
          ) : (
            <div
              ref={textRef}
              key="h"
              className="w-full text-center font-serif-elegant italic text-[var(--ink-soft)]"
              style={{ filter: "blur(6px)", opacity: 0.7 }}
            >
              <div className="text-2xl">••• Rahasia •••</div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {!revealed && (
        <button
          onPointerDown={begin}
          onPointerUp={end}
          onPointerLeave={end}
          onPointerCancel={end}
          className={`reveal-action ${isHolding ? "scale-[0.98]" : ""}`}
        >
          <div
            ref={progressRef}
            className="reveal-progress"
            style={{ transform: "scaleX(0)" }}
          />
          <span className="relative">{label}</span>
        </button>
      )}
    </div>
  );
}
