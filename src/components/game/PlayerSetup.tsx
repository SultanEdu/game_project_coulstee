import { useState } from "react";
import { usePlayers, type Player } from "@/lib/game/store";
import { Plus, X, Users } from "lucide-react";

export function PlayerSetup() {
  const [players, updatePlayers] = usePlayers();
  const [name, setName] = useState("");

  const add = () => {
    const n = name.trim();
    if (!n) return;
    if (players.find(p => p.name.toLowerCase() === n.toLowerCase())) return;
    const next: Player = { id: Date.now().toString(), name: n };
    updatePlayers([...players, next]);
    setName("");
  };

  return (
    <div className="parchment-card rounded-lg p-5">
      <div className="relative">
        <h3 className="font-display text-lg flex items-center gap-2 text-ink">
          <Users className="h-5 w-5" /> Daftar Pemain
        </h3>
        <p className="text-xs italic text-ink/60 mb-3">Tersimpan otomatis di perangkat ini</p>

        <div className="flex gap-2 mb-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Nama pemain..."
            className="flex-1 px-3 py-2 rounded border border-ink/30 bg-parchment-dark/40 text-ink placeholder:text-ink/40 font-serif-elegant"
          />
          <button
            onClick={add}
            className="rounded bg-mahogany text-gold px-3 gold-frame"
            aria-label="Tambah pemain"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <ul className="flex flex-wrap gap-2">
          {players.length === 0 && (
            <li className="text-ink/50 italic text-sm">Belum ada pemain. Tambahkan minimal 3.</li>
          )}
          {players.map((p) => (
            <li
              key={p.id}
              className="inline-flex items-center gap-1 bg-mahogany text-parchment rounded-full pl-3 pr-1 py-1 text-sm"
            >
              {p.name}
              <button
                onClick={() => updatePlayers(players.filter(x => x.id !== p.id))}
                className="rounded-full p-1 hover:bg-mahogany-deep"
                aria-label="Hapus"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}