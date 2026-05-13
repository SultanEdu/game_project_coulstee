import { useEffect, useState } from "react";

const PLAYERS_KEY = "bgs.players";
const SCORES_KEY = "bgs.scores"; // session only — but we mirror in sessionStorage

export type Player = { id: string; name: string };

export function loadPlayers(): Player[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PLAYERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function savePlayers(players: Player[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
}

export function loadScores(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(SCORES_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveScores(s: Record<string, number>) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SCORES_KEY, JSON.stringify(s));
  window.dispatchEvent(new Event("bgs.scores.update"));
}

export function awardWin(playerNames: string[], pts = 10) {
  const s = loadScores();
  for (const n of playerNames) s[n] = (s[n] || 0) + pts;
  saveScores(s);
}

export function usePlayers() {
  const [players, setPlayers] = useState<Player[]>([]);
  useEffect(() => {
    setPlayers(loadPlayers());
    const h = () => setPlayers(loadPlayers());
    window.addEventListener("storage", h);
    window.addEventListener("bgs.players.update", h);
    return () => {
      window.removeEventListener("storage", h);
      window.removeEventListener("bgs.players.update", h);
    };
  }, []);
  const update = (p: Player[]) => {
    savePlayers(p);
    setPlayers(p);
    window.dispatchEvent(new Event("bgs.players.update"));
  };
  return [players, update] as const;
}

export function useScores() {
  const [scores, setScores] = useState<Record<string, number>>({});
  useEffect(() => {
    setScores(loadScores());
    const h = () => setScores(loadScores());
    window.addEventListener("bgs.scores.update", h);
    return () => window.removeEventListener("bgs.scores.update", h);
  }, []);
  return scores;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}