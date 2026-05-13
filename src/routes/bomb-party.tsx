import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { PageFrame } from "@/components/game/PageFrame";
import { usePlayers, awardWin, shuffle } from "@/lib/game/store";
import { BOMB_SYLLABLES } from "@/data/bomb-syllables";
import { vibrate, tick, explode } from "@/lib/game/audio";
import { Bomb } from "lucide-react";

export const Route = createFileRoute("/bomb-party")({
  head: () => ({
    meta: [
      { title: "Bomb Party — The Board Game Suite" },
      { name: "description", content: "Sebut kata mengandung suku kata sebelum bom meledak." },
    ],
  }),
  component: BombPage,
});

type Stage = "setup" | "playing" | "exploded" | "end";

function BombPage() {
  const [players] = usePlayers();
  const [stage, setStage] = useState<Stage>("setup");
  const [order, setOrder] = useState<string[]>([]);
  const [alive, setAlive] = useState<string[]>([]);
  const [turn, setTurn] = useState(0);
  const [syll, setSyll] = useState("");
  const [total, setTotal] = useState(20);
  const [remain, setRemain] = useState(20);
  const intervalRef = useRef<number | null>(null);

  const begin = () => {
    if (players.length < 2) return;
    const o = shuffle(players).map(p => p.name);
    setOrder(o); setAlive(o); setTurn(0);
    nextRound(o, 0);
    setStage("playing");
  };

  const nextRound = (currentAlive: string[], turnIdx: number) => {
    setSyll(BOMB_SYLLABLES[Math.floor(Math.random() * BOMB_SYLLABLES.length)]);
    const t = 15 + Math.floor(Math.random() * 30);
    setTotal(t); setRemain(t);
    void currentAlive; void turnIdx;
  };

  // tick down
  useEffect(() => {
    if (stage !== "playing") return;
    intervalRef.current = window.setInterval(() => {
      setRemain(r => {
        if (r <= 1) {
          window.clearInterval(intervalRef.current!);
          handleExplode();
          return 0;
        }
        const left = r - 1;
        if (left <= 5) { vibrate(80); tick(1100, 0.06); }
        else if (left <= 10) { vibrate(40); tick(700, 0.05); }
        else { tick(500, 0.04); }
        return left;
      });
    }, 1000);
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, syll]);

  const handleExplode = () => {
    explode(); vibrate([300, 100, 300, 100, 600]);
    const dead = alive[turn];
    const nextAlive = alive.filter(n => n !== dead);
    if (nextAlive.length <= 1) {
      if (nextAlive.length === 1) awardWin(nextAlive);
      setAlive(nextAlive);
      setStage("end");
      return;
    }
    setAlive(nextAlive);
    const newTurn = turn % nextAlive.length;
    setTurn(newTurn);
    setStage("exploded");
  };

  const passTurn = () => {
    const newTurn = (turn + 1) % alive.length;
    setTurn(newTurn);
    setSyll(BOMB_SYLLABLES[Math.floor(Math.random() * BOMB_SYLLABLES.length)]);
    vibrate(20);
  };

  const continueAfterExplosion = () => {
    nextRound(alive, turn);
    setStage("playing");
  };

  const reset = () => { setStage("setup"); setAlive([]); setOrder([]); setTurn(0); };

  const fuse = (remain / total) * 100;

  return (
    <PageFrame title="Bomb Party" subtitle="Cepat sebut kata, sebelum meledak!">
      {stage === "setup" && (
        <div className="space-y-4">
          <p className="text-foreground/70 italic font-serif-elegant">
            Pemain di giliran harus menyebut kata Bahasa Indonesia yang mengandung suku kata yang muncul.
            Habis waktu = tersingkir.
          </p>
          <button disabled={players.length < 2} onClick={begin}
            className="w-full h-12 rounded gold-frame bg-mahogany text-gold font-display tracking-widest uppercase disabled:opacity-40">
            Nyalakan Sumbu ({players.length})
          </button>
        </div>
      )}

      {stage === "playing" && (
        <div className="space-y-6 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-foreground/60">Giliran</p>
          <h2 className="font-display text-3xl text-gold">{alive[turn]}</h2>

          <div className="parchment-card rounded-lg p-8">
            <p className="text-xs uppercase tracking-widest text-ink/60">Suku Kata</p>
            <motion.p
              key={syll}
              initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="font-display text-6xl text-mahogany mt-2"
            >
              {syll}
            </motion.p>
          </div>

          <div className="relative">
            <div className="h-3 w-full bg-mahogany rounded-full overflow-hidden gold-frame">
              <motion.div
                animate={{ width: `${fuse}%` }}
                transition={{ duration: 1, ease: "linear" }}
                className={`h-full ${remain <= 5 ? "bg-destructive" : "bg-gold"}`}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-foreground/60">
              <span>{remain}s</span>
              <span className="inline-flex items-center gap-1"><Bomb className="h-3 w-3" /> Sumbu menipis</span>
            </div>
          </div>

          <button onClick={passTurn}
            className="w-full h-14 rounded gold-frame bg-deep-green text-parchment font-display tracking-widest uppercase">
            Sudah! Oper
          </button>
        </div>
      )}

      {stage === "exploded" && (
        <div className="text-center space-y-5">
          <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.4, 1] }} className="text-7xl">💥</motion.div>
          <p className="font-display text-2xl text-destructive">Tersingkir!</p>
          <p className="font-serif-elegant text-foreground/80">{alive.length} pemain tersisa</p>
          <button onClick={continueAfterExplosion}
            className="w-full h-12 rounded gold-frame bg-mahogany text-gold font-display tracking-widest uppercase">
            Lanjutkan
          </button>
        </div>
      )}

      {stage === "end" && (
        <div className="text-center space-y-4">
          <h2 className="font-display text-3xl text-gold">
            {alive[0] ? `🏆 ${alive[0]} Menang!` : "Seri 💀"}
          </h2>
          <p className="font-serif-elegant italic text-foreground/70">
            Urutan awal: {order.join(" → ")}
          </p>
          <button onClick={reset}
            className="w-full h-12 rounded gold-frame bg-mahogany text-gold font-display tracking-widest uppercase">
            Main Lagi
          </button>
        </div>
      )}
    </PageFrame>
  );
}