import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PageFrame } from "@/components/game/PageFrame";
import { HoldToReveal } from "@/components/game/HoldToReveal";
import { usePlayers, awardWin, shuffle } from "@/lib/game/store";
import { UNDERCOVER_PAIRS } from "@/data/undercover-words";
import { playSound, vibrate } from "@/lib/game/audio";

export const Route = createFileRoute("/undercover")({
  head: () => ({
    meta: [
      { title: "Undercover — The Board Game Suite" },
      { name: "description", content: "Civilian, Undercover, atau Mr. White? Tebak siapa yang berbeda." },
    ],
  }),
  component: UndercoverPage,
});

type Role = "civilian" | "undercover" | "mrwhite";
type Assign = { name: string; role: Role; word: string | null; alive: boolean };

function buildRoles(n: number, undercoverCount: number, mrWhiteCount: number): Role[] {
  const civCount = n - undercoverCount - mrWhiteCount;
  return shuffle([
    ...Array(civCount).fill("civilian"),
    ...Array(undercoverCount).fill("undercover"),
    ...Array(mrWhiteCount).fill("mrwhite"),
  ]) as Role[];
}

const ROLES = [
  {
    id: "civilian",
    name: "Civilian",
    icon: "👥",
    detail: "Cari siapa undercover dengan mendiskusikan kata yang sama. Hindari tereliminasi!",
    faction: "good" as const,
  },
  {
    id: "undercover", 
    name: "Undercover",
    icon: "🕵️",
    detail: "Mendapat kata berbeda. Berbohong dan sembunyikan identitas sebagai undercover.",
    faction: "evil" as const,
  },
  {
    id: "mrwhite",
    name: "Mr. White", 
    icon: "🤵",
    detail: "Tidak mendapat kata sama sekali. Berbohong dan tebak kata yang benar.",
    faction: "evil" as const,
  },
];

function UndercoverPage() {
  const [players] = usePlayers();
  const [stage, setStage] = useState<"config" | "setup" | "reveal" | "discussion" | "vote" | "end">("config");
  const [undercoverCount, setUndercoverCount] = useState(1);
  const [mrWhiteCount, setMrWhiteCount] = useState(0);
  const [discussionTime, setDiscussionTime] = useState(60); // 1 minute default
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timerEndSoundPlayed, setTimerEndSoundPlayed] = useState(false);
  const [victoryAnimation, setVictoryAnimation] = useState(false);
  const [votingPanel, setVotingPanel] = useState<{ name: string; role: Role } | null>(null);
  const [flippedRoles, setFlippedRoles] = useState<Set<string>>(new Set());
  const [assigns, setAssigns] = useState<Assign[]>([]);
  const [idx, setIdx] = useState(0);
  const [winner, setWinner] = useState<string>("");

  const civilianCount = Math.max(0, players.length - undercoverCount - mrWhiteCount);
  const evilTeamCount = undercoverCount + mrWhiteCount;
  const isValidConfig = players.length >= 4 && civilianCount >= 3 && evilTeamCount >= 1;

  const toggleRoleFlip = (roleId: string) => {
    setFlippedRoles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roleId)) {
        newSet.delete(roleId);
      } else {
        newSet.add(roleId);
      }
      return newSet;
    });
  };

  const start = () => {
    if (!isValidConfig) return;
    const [w1, w2] = UNDERCOVER_PAIRS[Math.floor(Math.random() * UNDERCOVER_PAIRS.length)];
    const civWord = Math.random() < 0.5 ? w1 : w2;
    const undWord = civWord === w1 ? w2 : w1;
    const roles = buildRoles(players.length, undercoverCount, mrWhiteCount);
    const order = shuffle(players);
    const a: Assign[] = order.map((p, i) => ({
      name: p.name,
      role: roles[i],
      word: roles[i] === "mrwhite" ? null : roles[i] === "undercover" ? undWord : civWord,
      alive: true,
    }));
    setAssigns(a); setIdx(0); setStage("reveal");
    vibrate(50);
  };

  const current = assigns[idx];
  const nextPlayer = () => {
    if (idx < assigns.length - 1) setIdx(idx + 1);
    else {
      setTimeRemaining(discussionTime);
      setStage("discussion");
    }
    vibrate(30);
  };

  const eliminate = (name: string) => {
    if (stage !== "vote" || votingPanel) return;
    const eliminated = assigns.find(a => a.name === name && a.alive);
    if (!eliminated) return;
    
    // Show voting panel with sound effect
    setVotingPanel({ name, role: eliminated.role });
    
    // Play sound based on role
    if (eliminated.role === "civilian") {
      playFailedSound();
    } else {
      playWinSound();
    }
    
    vibrate([20, 30, 60]);
  };

  const continueAfterElimination = () => {
    if (!votingPanel) return;
    
    const { name } = votingPanel;
    const next = assigns.map(a => a.name === name ? { ...a, alive: false } : a);
    setAssigns(next);
    
    const aliveUnd = next.filter(a => a.alive && (a.role === "undercover" || a.role === "mrwhite")).length;
    const aliveCiv = next.filter(a => a.alive && a.role === "civilian").length;

    if (votingPanel.role === "undercover" || votingPanel.role === "mrwhite") {
      const winners = next.filter(a => a.alive && a.role === "civilian").map(a => a.name);
      awardWin(winners);
      setWinner("Civilian Menang!");
      setVictoryAnimation(true);
      setVotingPanel(null);
      return;
    }
    
    if (aliveUnd === 0) {
      const winners = next.filter(a => a.alive && a.role === "civilian").map(a => a.name);
      awardWin(winners);
      setWinner("Civilian Menang!");
      setVictoryAnimation(true);
      setVotingPanel(null);
    } else if (aliveUnd >= aliveCiv) {
      const winners = next.filter(a => a.role !== "civilian").map(a => a.name);
      awardWin(winners);
      setWinner("Undercover & Mr. White Menang!");
      setVictoryAnimation(true);
      setVotingPanel(null);
    } else {
      // Game continues, check if evil team still exists
      if (aliveUnd > 0) {
        // Return to discussion timer
        setVotingPanel(null);
        setTimerEndSoundPlayed(false);
        setTimeRemaining(discussionTime);
        setStage("discussion");
      } else {
        // No evil team left (shouldn't happen with current logic)
        setVotingPanel(null);
      }
    }
  };

  const playEndSound = () => {
    playSound("/end.mp3");
  };

  const playWinSound = () => {
    playSound("/WIN.mp3");
  };

  const playVictorySound = () => {
    playSound("/victory.mp3");
  };

  const playFailedSound = () => {
    playSound("/FAILED.mp3");
  };

  const getVictoryText = () => {
    if (winner === "Civilian Menang!") {
      return "Tim Baik Menang!";
    } else if (winner === "Undercover & Mr. White Menang!") {
      return "Tim Jahat Menang!";
    }
    return winner;
  };

  const reset = () => { 
    setStage("config"); 
    setAssigns([]); 
    setIdx(0); 
    setTimeRemaining(0); 
    setTimerEndSoundPlayed(false);
    setVictoryAnimation(false);
    setVotingPanel(null);
    setWinner(""); 
  };

  const aliveList = useMemo(() => assigns.filter(a => a.alive), [assigns]);

  // Timer countdown effect
  useEffect(() => {
    if (stage === "discussion" && timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (stage === "discussion" && timeRemaining === 0 && !timerEndSoundPlayed) {
      playEndSound();
      setTimerEndSoundPlayed(true);
      setStage("vote");
      vibrate([20, 30, 60]);
    }
  }, [stage, timeRemaining, timerEndSoundPlayed]);

  return (
    <PageFrame title="Undercover" subtitle="Cari yang berbeda di antara kalian">
      <div className="undercover-page">
      {stage === "config" && (
        <div className="space-y-6">
          {/* Player count info */}
          <div className="text-center mb-6">
          <h2 className="font-display text-2xl text-gold text-center">Konfigurasi Role</h2>

          <p className="text-foreground/70 italic font-serif-elegant text-center">
            Total: {players.length} pemain
          </p>
            {players.length < 4 && (
              <p className="text-destructive text-sm mt-2">
                Minimal 4 pemain diperlukan
              </p>
            )}
          </div>

          {/* Role Cards Configuration */}
          <div className="space-y-4">
            <h3 className="font-display text-sm text-gold mb-3">Atur Jumlah Role</h3>
            
            {/* Undercover Role Card */}
            <div 
              className="parchment-card undercover-role-card"
              onClick={() => toggleRoleFlip("undercover")}
              style={{ perspective: "1000px", minHeight: "80px" }}
            >
              <div 
                className={`undercover-role-card__flip transition-transform duration-700 transform-style-preserve-3d ${
                  flippedRoles.has("undercover") ? "rotate-y-180" : ""
                }`}
                style={{ 
                  transformStyle: "preserve-3d",
                  transform: flippedRoles.has("undercover") ? "rotateY(180deg)" : "rotateY(0deg)"
                }}
              >
                {/* Front of card */}
                <div 
                  className="undercover-role-card__face backface-hidden absolute inset-0"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <div 
                    className="undercover-role-card__body h-full flex items-center px-3"
                    style={{ paddingTop: "25px", paddingBottom: "12px" }}
                  >
                    <div className="undercover-role-card__row flex items-center justify-between w-full">
                      <div className="undercover-role-card__identity flex items-center gap-2">
                        <span className="text-2xl flex-shrink-0">🕵️</span>
                        <div className="flex flex-col">
                          <h3 className="font-display text-ink leading-tight">Undercover</h3>
                          <p className="text-xs text-ink/60 leading-tight">Tim Jahat</p>
                        </div>
                      </div>
                      
                      <div 
                        className="undercover-role-card__controls flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => setUndercoverCount(Math.max(0, undercoverCount - 1))}
                          disabled={undercoverCount === 0 && mrWhiteCount === 0}
                          className="w-8 h-8 rounded bg-mahogany text-gold disabled:opacity-40"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-display text-ink">{undercoverCount}</span>
                        <button
                          onClick={() => setUndercoverCount(undercoverCount + 1)}
                          disabled={players.length < 4 || (players.length - (undercoverCount + 1) - mrWhiteCount) < 3}
                          className="w-8 h-8 rounded bg-mahogany text-gold disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Back of card */}
                <div 
                  className="undercover-role-card__face undercover-role-card__back absolute inset-0 backface-hidden"
                  style={{ 
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)"
                  }}
                >
                  <div 
                    className="undercover-role-card__body flex flex-col justify-center h-full"
                    style={{ paddingLeft: "12px", paddingRight: "12px", paddingTop: "27px", paddingBottom: "12px" }}
                  >
                    <p className="undercover-role-description text-xs text-ink leading-tight">
                      Mendapat kata berbeda. Berbohong dan sembunyikan identitas sebagai undercover.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Mr. White Role Card */}
            <div 
              className="parchment-card undercover-role-card"
              onClick={() => toggleRoleFlip("mrwhite")}
              style={{ perspective: "1000px", minHeight: "80px" }}
            >
              <div 
                className={`undercover-role-card__flip transition-transform duration-700 transform-style-preserve-3d ${
                  flippedRoles.has("mrwhite") ? "rotate-y-180" : ""
                }`}
                style={{ 
                  transformStyle: "preserve-3d",
                  transform: flippedRoles.has("mrwhite") ? "rotateY(180deg)" : "rotateY(0deg)"
                }}
              >
                {/* Front of card */}
                <div 
                  className="undercover-role-card__face backface-hidden absolute inset-0"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <div 
                    className="undercover-role-card__body h-full flex items-center px-3"
                    style={{ paddingTop: "25px", paddingBottom: "12px" }}
                  >
                    <div className="undercover-role-card__row flex items-center justify-between w-full">
                      <div className="undercover-role-card__identity flex items-center gap-2">
                        <span className="text-2xl flex-shrink-0">🤵</span>
                        <div className="flex flex-col">
                          <h3 className="font-display text-ink leading-tight">Mr. White</h3>
                          <p className="text-xs text-ink/60 leading-tight">Tim Jahat</p>
                        </div>
                      </div>
                      
                      <div 
                        className="undercover-role-card__controls flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => setMrWhiteCount(Math.max(0, mrWhiteCount - 1))}
                          disabled={mrWhiteCount === 0 && undercoverCount === 0}
                          className="w-8 h-8 rounded bg-mahogany text-gold disabled:opacity-40"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-display text-ink">{mrWhiteCount}</span>
                        <button
                          onClick={() => setMrWhiteCount(mrWhiteCount + 1)}
                          disabled={players.length < 4 || (players.length - undercoverCount - (mrWhiteCount + 1)) < 3}
                          className="w-8 h-8 rounded bg-mahogany text-gold disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Back of card */}
                <div 
                  className="undercover-role-card__face undercover-role-card__back absolute inset-0 backface-hidden"
                  style={{ 
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)"
                  }}
                >
                  <div 
                    className="undercover-role-card__body flex flex-col justify-center h-full"
                    style={{ paddingLeft: "12px", paddingRight: "12px", paddingTop: "27px", paddingBottom: "12px" }}
                  >
                    <p className="undercover-role-description text-xs text-ink leading-tight">
                      Tidak mendapat kata sama sekali. Berbohong dan tebak kata yang benar.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Timer Configuration - Grouped for easier positioning */}
          <div className="space-y-3">
            <h3 className="font-display text-sm text-gold mb-3">Waktu Diskusi</h3>
            
            <div 
              className="parchment-card undercover-timer-card"
              style={{ perspective: "1000px", minHeight: "80px" }}
            >
              <div 
                className="undercover-timer-card__body flex flex-col justify-center h-full px-3"
                style={{ paddingTop: "15px", paddingBottom: "15px" }}
              >
                <div className="undercover-timer-card__row flex items-center justify-between w-full">
                  <div className="undercover-role-card__identity flex items-center gap-2">
                    <span className="text-2xl flex-shrink-0">⏱️</span>
                    <div className="flex flex-col">
                      <h3 className="font-display text-ink leading-tight">Durasi</h3>
                      <p className="text-xs text-ink/60 leading-tight">
                        {Math.floor(discussionTime / 60)}:{(discussionTime % 60).toString().padStart(2, '0')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="undercover-role-card__controls flex items-center gap-2">
                    <button
                      onClick={() => setDiscussionTime(Math.max(30, discussionTime - 15))}
                      disabled={discussionTime === 30 || players.length < 4}
                      className="w-8 h-8 rounded bg-mahogany text-gold disabled:opacity-40"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-display text-ink">{Math.floor(discussionTime / 60)}:{(discussionTime % 60).toString().padStart(2, '0')}</span>
                    <button
                      onClick={() => setDiscussionTime(Math.min(600, discussionTime + 15))}
                      disabled={discussionTime >= 600 || players.length < 4}
                      className="w-8 h-8 rounded bg-mahogany text-gold disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Role summary */}
          <div className="parchment-card undercover-summary-card">
            <h3 className="font-display text-sm mb-3 text-center">Ringkasan Role</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink">Civilian:</span>
                <span className="font-display text-black">{civilianCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink">Undercover:</span>
                <span className="font-display text-mahogany">{undercoverCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink">Mr. White:</span>
                <span className="font-display text-mahogany">{mrWhiteCount}</span>
              </div>
            </div>
          </div>

          {/* Warning messages */}
          {!isValidConfig && players.length >= 4 && (
            <div className="text-center space-y-2">
              {civilianCount < 3 && (
                <p className="text-destructive text-sm">
                  Terlalu banyak Role khusus! Civilian minimal 3 orang
                </p>
              )}
              {evilTeamCount <= 0 && (
                <p className="text-destructive text-sm">
                  Minimal 1 anggota tim jahat (Undercover atau Mr. White) diperlukan
                </p>
              )}
            </div>
          )}

          {/* Start button */}
          <button
            disabled={!isValidConfig}
            onClick={() => setStage("setup")}
            className="w-full h-12 rounded gold-frame bg-mahogany text-gold font-display tracking-widest uppercase disabled:opacity-40"
          >
            Lanjut ke Setup
          </button>
        </div>
      )}

      {stage === "setup" && (
        <div className="undercover-setup-page space-y-4">
          <p className="undercover-setup-intro text-foreground/70 italic font-serif-elegant">
            Minimal 4 pemain. Setiap orang diberi kata; beberapa di antaranya berbeda.
            Mr. White tidak diberi kata sama sekali.
          </p>
          <div className="parchment-card undercover-setup-summary">
            <div className="undercover-setup-summary__row"><span>Undercover</span><strong>{undercoverCount}</strong></div>
            <div className="undercover-setup-summary__row"><span>Mr. White</span><strong>{mrWhiteCount}</strong></div>
            <div className="undercover-setup-summary__row"><span>Civilian</span><strong>{civilianCount}</strong></div>
            <div className="undercover-setup-summary__row undercover-setup-summary__time"><span>Waktu diskusi</span><strong>{Math.floor(discussionTime / 60)}:{(discussionTime % 60).toString().padStart(2, '0')}</strong></div>
          </div>
          <button
            onClick={start}
            className="undercover-start-button w-full h-12 rounded gold-frame bg-mahogany text-gold font-display tracking-widest uppercase"
          >
            Mulai ({players.length} pemain)
          </button>
        </div>
      )}

      {stage === "reveal" && current && (
        <motion.div key={idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="undercover-reveal-page space-y-6">
          <div className="undercover-reveal-heading text-center">
            <p className="text-xs text-foreground/60 uppercase tracking-widest">Giliran</p>
            <h2 className="font-display text-3xl text-gold">{current.name}</h2>
            <p className="undercover-reveal-progress text-xs italic text-foreground/50 mt-1">
              Pemain {idx + 1} / {assigns.length}
            </p>
          </div>
          <div className="parchment-card undercover-reveal-card rounded-lg p-6">
            <HoldToReveal>
              <div className="undercover-reveal-content text-center">
                {current.role === "mrwhite" ? (
                  <>
                    <p className="text-xs uppercase text-ink/60 mb-1">Role</p>
                    <p className="font-display text-3xl text-mahogany">Mr. White</p>
                    <p className="italic text-ink/70 mt-2">Tidak ada kata. Berbohonglah!</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs uppercase text-ink/60 mb-1">Kata Rahasia</p>
                    <p className="font-display text-3xl text-mahogany">{current.word}</p>
                  </>
                )}
              </div>
            </HoldToReveal>
          </div>
          <button
            onClick={nextPlayer}
            className="w-full h-12 rounded gold-frame bg-mahogany text-gold font-display tracking-widest uppercase"
          >
            {idx < assigns.length - 1 ? "Oper ke Berikutnya" : "Mulai Diskusi"}
          </button>
        </motion.div>
      )}

      {stage === "discussion" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="undercover-timer-page space-y-6">
          <div className="undercover-timer-heading text-center">
            <p className="text-xs text-foreground/60 uppercase tracking-widest">Waktu Diskusi</p>
            <h2 className="font-display text-2xl text-gold">Diskusikan & Cari Penjahatnya!</h2>
          </div>
          
          <div className="undercover-discussion-timer">
            <div className="undercover-discussion-timer__top"><span>DISKUSI BERJALAN</span><span>{Math.round((timeRemaining / discussionTime) * 100)}% waktu</span></div>
            <div className="undercover-discussion-timer__time">
              <p className="font-display text-3xl text-gold">{Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}</p>
              <span>tersisa</span>
            </div>
            <div className="undercover-discussion-timer__track"><div className="undercover-discussion-timer__progress" style={{ width: `${Math.max(0, Math.min(100, (timeRemaining / discussionTime) * 100))}%` }} /></div>
          </div>

          <div className="undercover-timer-actions text-center space-y-4">
            <p className="undercover-timer-instruction text-foreground/70 italic font-serif-elegant">
              Setiap pemain mendapat kata. Diskusikan untuk mencari siapa yang berbeda!
            </p>
            <button
            onClick={() => {
              if (!timerEndSoundPlayed) {
                playEndSound();
              }
              setStage("vote");
            }}
            className="undercover-vote-button w-full h-12 rounded gold-frame bg-mahogany text-gold font-display tracking-widest uppercase"
          >
            Mulai Voting
          </button>
          </div>

          {/* Timer Effect */}
          {timeRemaining > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="undercover-timer-status text-center"
            >
              <p className="text-xs text-ink/60">Timer berjalan...</p>
            </motion.div>
          )}
        </motion.div>
      )}

      {stage === "vote" && (
        <div className="undercover-vote-page space-y-4">
          <div className="undercover-vote-heading">
            <span className="undercover-vote-kicker">PILIHAN TERAKHIR</span>
            <p className="text-center font-serif-elegant italic text-foreground/80">
              Diskusikan & vote pemain untuk dieliminasi.
            </p>
          </div>
          <motion.div
            className="undercover-vote-list"
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {aliveList.map(a => (
              <button
                key={a.name}
                onClick={() => eliminate(a.name)}
                disabled={Boolean(votingPanel)}
                className="undercover-vote-player w-full parchment-card rounded p-3 font-serif-elegant text-ink text-lg active:scale-[0.98] transition-transform"
              >
                <span className="undercover-vote-avatar">{a.name.slice(0, 1).toUpperCase()}</span>
                <span className="undercover-vote-name">{a.name}</span>
                <span className="undercover-vote-arrow">→</span>
              </button>
            ))}
          </motion.div>

          {/* Voting Panel */}
          {votingPanel && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="undercover-elimination-overlay fixed inset-0 flex items-center justify-center z-50 bg-black/50"
            >
              <div className="undercover-elimination-modal parchment-card rounded-lg p-6 max-w-sm mx-4">
                <div className="undercover-elimination-content text-center space-y-4">
                  <span className="undercover-elimination-label">HASIL VOTING</span>
                  <h3 className="font-display text-xl text-ink">
                    {votingPanel.name} Telah Dieliminasi!
                  </h3>
                  
                  <div className="undercover-elimination-icon-wrap flex justify-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl ${
                      votingPanel.role === "civilian" 
                        ? "bg-gray-100" 
                        : votingPanel.role === "undercover" 
                        ? "bg-red-100" 
                        : "bg-purple-100"
                    }`}>
                      {votingPanel.role === "civilian" 
                        ? "👥" 
                        : votingPanel.role === "undercover" 
                        ? "🕵️" 
                        : "🤵"}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="font-display text-lg">
                      {votingPanel.role === "civilian" 
                        ? "Civilian" 
                        : votingPanel.role === "undercover" 
                        ? "Undercover" 
                        : "Mr. White"}
                    </p>
                    <p className={`text-sm ${
                      votingPanel.role === "civilian" 
                        ? "text-gray-600" 
                        : votingPanel.role === "undercover" 
                        ? "text-red-600" 
                        : "text-purple-600"
                    }`}>
                      {votingPanel.role === "civilian" 
                        ? "Tim Baik" 
                        : "Tim Jahat"}
                    </p>
                  </div>
                  <p className="undercover-elimination-next">
                    {votingPanel.role === "civilian" ? "Pemain ini keluar. Diskusi dilanjutkan." : "Tepat sasaran! Tim baik memenangkan permainan."}
                  </p>
                  
                  <button
                    onClick={continueAfterElimination}
                    className="w-full h-10 rounded gold-frame bg-mahogany text-gold font-display tracking-widest uppercase mt-4"
                  >
                    {votingPanel.role === "civilian" ? "Lanjut ke Diskusi" : "Selesai · Lihat Hasil"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {victoryAnimation && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className={`undercover-victory-overlay fixed inset-0 flex items-center justify-center z-50 ${winner === "Civilian Menang!" ? "is-good" : "is-evil"}`}
        >
          <motion.div
            initial={{ scale: .94, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ duration: .45, ease: "easeOut" }}
            onAnimationComplete={() => {
              playVictorySound();
              setTimeout(() => {
                setVictoryAnimation(false);
                setStage("end");
              }, 1000);
            }}
            className="undercover-victory-card"
          >
            <span className="undercover-victory-card__kicker">PERMAINAN SELESAI</span>
            <span className="undercover-victory-card__icon">{winner === "Civilian Menang!" ? "✦" : "♠"}</span>
            <h2>{getVictoryText()}</h2>
            <p>{winner === "Civilian Menang!" ? "Tim baik berhasil menemukan semua penyusup." : "Tim jahat berhasil menguasai permainan."}</p>
          </motion.div>
        </motion.div>
      )}

      {stage === "end" && (
        <motion.div className="undercover-end-page" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4, ease: "easeOut" }}>
          <div className="undercover-end-heading"><span>HASIL AKHIR</span><h2>{getVictoryText()}</h2><p>Berikut identitas seluruh pemain.</p></div>
          <div className="parchment-card undercover-end-summary">
            <p className="undercover-end-summary__label">Pengungkapan Role</p>
            <ul>
              {assigns.map(a => (
                <li key={a.name} className={a.alive ? "is-alive" : "is-out"}>
                  <span className="undercover-end-player"><i className={`undercover-end-role-icon is-${a.role}`} aria-label={a.role === "civilian" ? "Civilian" : a.role === "undercover" ? "Undercover" : "Mr. White"}>{a.role === "civilian" ? "👥" : a.role === "undercover" ? "🕵️" : "🤵"}</i>{a.name}</span>
                  <span className="undercover-end-role">
                    {a.role === "civilian" ? "Civilian" : a.role === "undercover" ? "Undercover" : "Mr. White"}{a.word ? ` • ${a.word}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <button onClick={reset} className="undercover-end-button w-full h-12 rounded gold-frame bg-mahogany text-gold font-display tracking-widest uppercase">
            Main Lagi
          </button>
        </motion.div>
      )}
      </div>
    </PageFrame>
  );
}