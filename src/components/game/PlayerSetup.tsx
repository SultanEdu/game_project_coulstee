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
    <div className="parchment-card rounded-xl p-6 shadow-lg">
      <h3 className="font-display text-xl flex items-center gap-3 text-ink mb-2 font-bold">
        <Users className="h-6 w-6" /> Daftar Pemain
      </h3>
      <p className="text-sm italic text-ink/60 mb-4">Tersimpan otomatis di perangkat ini</p>

      <div className="flex gap-2 mb-5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Nama pemain..."
          className="flex-1 px-4 py-3 rounded-lg border-2 border-ink/20 bg-white/50 text-ink placeholder:text-ink/40 font-serif-elegant focus:outline-none focus:border-mahogany focus:ring-2 focus:ring-mahogany/30 transition-all"
        />
        <button
          onClick={add}
          className="px-4 py-3 rounded-lg bg-mahogany text-parchment font-bold gold-frame hover:bg-mahogany-deep transition-colors active:scale-95"
          aria-label="Tambah pemain"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Players List */}
      {players.length === 0 ? (
        <p className="text-ink/50 italic text-center py-4">Belum ada pemain. Tambahkan minimal 3.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {players.map((p) => (
            <div
              key={p.id}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-mahogany to-mahogany-deep text-parchment rounded-full pl-4 pr-2 py-2 text-sm font-serif-elegant shadow-md hover:shadow-lg transition-shadow"
            >
              <span className="font-semibold">{p.name}</span>
              <button
                onClick={() => updatePlayers(players.filter(x => x.id !== p.id))}
                className="rounded-full p-1 hover:bg-mahogany-deep/50 transition-colors"
                aria-label="Hapus"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
