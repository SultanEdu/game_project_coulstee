import { useState } from 'react'
import { Plus, Users, X } from 'lucide-react'
import { usePlayers, type Player } from '@/lib/game/store'

export function PlayerSetup() {
  const [players, updatePlayers] = usePlayers()
  const [name, setName] = useState('')

  const add = () => {
    const trimmed = name.trim()
    if (!trimmed || players.some((player) => player.name.toLowerCase() === trimmed.toLowerCase())) return
    const next: Player = { id: Date.now().toString(), name: trimmed }
    updatePlayers([...players, next])
    setName('')
  }

  return (
    <>
      <div className="players-form">
        <span className="section-icon" aria-hidden="true"><Users size={19} /></span>
        <input value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && add()} placeholder="Ketik nama pemain..." className="players-input" aria-label="Nama pemain" />
        <button onClick={add} className="icon-button" aria-label="Tambah pemain"><Plus size={20} /></button>
      </div>
      {players.length === 0 ? <div className="empty-state">Belum ada pemain. Tambahkan minimal 3 nama untuk mulai bermain.</div> : <div className="player-list">{players.map((player) => <div key={player.id} className="player-pill"><span>{player.name}</span><button className="player-remove" onClick={() => updatePlayers(players.filter((item) => item.id !== player.id))} aria-label={`Hapus ${player.name}`}><X size={14} /></button></div>)}</div>}
    </>
  )
}
