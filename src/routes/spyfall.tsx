import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PageFrame } from "@/components/game/PageFrame";
import { HoldToReveal } from "@/components/game/HoldToReveal";
import { usePlayers, awardWin, shuffle } from "@/lib/game/store";
import { SPYFALL_LOCATIONS } from "@/data/spyfall-locations";
import { vibrate, tick } from "@/lib/game/audio";

export const Route = createFileRoute("/spyfall")({
  head: () => ({
    meta: [
      { title: "Spyfall — The Board Game Suite" },
      { name: "description", content: "Temukan sang mata-mata di antara para pemain." },
    ],
  }),
  component: SpyfallPage,
});

type SP = { name: string; isSpy: boolean };
type Stage = "setup" | "reveal" | "timer" | "vote" | "end";

function SpyfallPage() {
  const [players] = usePlayers();
  const [stage, setStage] = useState<Stage>("setup");
  const [list, setList] = useState<SP[]>([]);
  const [idx, setIdx] = useState(0);
  const [location, setLocation] = useState("");
  const [secs, setSecs] = useState(300);
  const [winner, setWinner] = useState("");

  const start = () => {
    if (players.length < 3) return;
    const order = shuffle(players);
    const spyIdx = Math.floor(Math.random() * order.length);
    setLocation(SPYFALL_LOCATIONS[Math.floor(Math.random() * SPYFALL_LOCATIONS.length)]);
    setList(order.map((p, i) => ({ name: p.name, isSpy: i === spyIdx })));
    setIdx(0); setStage("reveal"); vibrate(50);
  };

  useEffect(() => {
    if (stage !== "timer") return;
    if (secs <= 0) { vibrate([100, 50, 200]); setStage("vote"); return; }
    const t = setTimeout(() => {
      setSecs(s => s - 1);
      if (secs <= 11) tick(900, 0.05);
    }, 1000);
    return () => clearTimeout(t);
  }, [stage, secs]);

  const next = () => {
    if (idx < list.length - 1) setIdx(idx + 1);
    else { setStage("timer"); setSecs(300); }
    vibrate(20);
  };

  const accuse = (name: string) => {
    const t = list.find(p => p.name === name)!;
    if (t.isSpy) {
      const winners = list.filter(p => !p.isSpy).map(p => p.name);
      awardWin(winners);
      setWinner(`Mata-mata tertangkap! (${t.name})`);
    } else {
      const spy = list.find(p => p.isSpy)!;
      awardWin([spy.name]);
      setWinner(`Salah tuduh! Mata-mata: ${spy.name}`);
    }
    setStage("end");
  };

  const reset = () => { setStage("setup"); setList([]); setIdx(0); setSecs(300); setWinner(""); };

  const cur = list[idx];
  const mins = Math.floor(secs / 60); const ss = (secs % 60).toString().padStart(2, "0");

  return (
    <PageFrame title="Spyfall" subtitle="Siapa pendusta di tengah kita?">
      {stage === "setup" && (
        <div className="space-y-4">
          <p className="text-foreground/70 italic font-serif-elegant">
            Semua pemain melihat lokasi yang sama, kecuali satu mata-mata. Ajukan pertanyaan untuk menemukannya.
          </p>
          <button disabled={players.length < 3} onClick={start}
            className="w-full h-12 rounded gold-frame bg-mahogany text-gold font-display tracking-widest uppercase disabled:opacity-40">
            Mulai ({players.length})
          </button>
        </div>
      )}

      {stage === "reveal" && cur && (
        <motion.div key={idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="text-center">
            <p className="text-xs text-foreground/60 uppercase tracking-widest">Giliran</p>
            <h2 className="font-display text-3xl text-gold">{cur.name}</h2>
          </div>
          <div className="parchment-card rounded-lg p-6">
            <HoldToReveal>
              <div className="text-center">
                <p className="text-xs uppercase text-ink/60 mb-1">Lokasi</p>
                <p className="font-display text-3xl text-mahogany">
                  {cur.isSpy ? "MATA-MATA" : location}
                </p>
                {cur.isSpy && <p className="italic text-ink/70 mt-2">Tebak lokasi tanpa membongkar dirimu.</p>}
              </div>
            </HoldToReveal>
          </div>
          <button onClick={next} className="w-full h-12 rounded gold-frame bg-mahogany text-gold font-display tracking-widest uppercase">
            {idx < list.length - 1 ? "Oper HP" : "Mulai Timer"}
          </button>
        </motion.div>
      )}

      {stage === "timer" && (
        <div className="text-center space-y-6">
          <p className="text-xs uppercase tracking-[0.3em] text-foreground/60">Waktu Tersisa</p>
          <motion.div
            key={secs}
            initial={{ scale: 1 }} animate={{ scale: secs <= 10 ? [1, 1.08, 1] : 1 }}
            className={`font-display text-7xl ${secs <= 10 ? "text-destructive" : "text-gold"}`}
          >
            {mins}:{ss}
          </motion.div>
          <p className="font-serif-elegant italic text-foreground/70">
            Ajukan pertanyaan bergantian. Vote saat siap.
          </p>
          <button onClick={() => setStage("vote")} className="w-full h-12 rounded gold-frame bg-mahogany text-gold font-display tracking-widest uppercase">
            Lakukan Voting
          </button>
        </div>
      )}

      {stage === "vote" && (
        <div className="space-y-3">
          <p className="text-center italic text-foreground/70">Tuduh sang mata-mata:</p>
          {list.map(p => (
            <button key={p.name} onClick={() => accuse(p.name)}
              className="w-full parchment-card rounded p-3 font-serif-elegant text-ink text-lg">
              {p.name}
            </button>
          ))}
        </div>
      )}

      {stage === "end" && (
        <div className="text-center space-y-4">
          <h2 className="font-display text-2xl text-gold">{winner}</h2>
          <p className="font-serif-elegant italic text-foreground/80">Lokasi: <span className="text-gold">{location}</span></p>
          <button onClick={reset} className="w-full h-12 rounded gold-frame bg-mahogany text-gold font-display tracking-widest uppercase">
            Main Lagi
          </button>
        </div>
      )}
    </PageFrame>
  );
}