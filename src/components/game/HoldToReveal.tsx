import { useRef, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { vibrate } from "@/lib/game/audio";

export function HoldToReveal({
  children,
  duration = 800,
}: {
  children: React.ReactNode;
  duration?: number;
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

    if (p >= 1) {
      setRevealed(true);
      vibrate(80);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  const begin = () => {
    if (revealed) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
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
    }
  };

  const openOnTap = () => {
    if (!revealed) {
      setRevealed(true);
      vibrate(80);
    }
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <button
        type="button"
        onClick={openOnTap}
        onPointerDown={(event) => {
          event.preventDefault();
          begin();
        }}
        onPointerUp={end}
        onPointerCancel={end}
        className="reveal-card-trigger relative flex min-h-[180px] w-full items-center justify-center"
        style={{ WebkitUserSelect: "none", userSelect: "none", touchAction: "manipulation" }}
      >
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
              className="reveal-placeholder-wrap w-full text-center font-serif-elegant text-[var(--ink-soft)]"
            >
              <div className="undercover-secret-placeholder text-2xl">Tekan untuk membuka kata rahasia</div>
            </div>
          )}
        </AnimatePresence>
        {!revealed && <div ref={progressRef} className="reveal-progress" style={{ transform: "scaleX(0)" }} />}
      </button>
    </div>
  );
}
