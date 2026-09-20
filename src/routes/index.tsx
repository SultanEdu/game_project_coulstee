import { createFileRoute, Link } from '@tanstack/react-router'
import { Bomb, Eye, MapPin, Trophy, Skull } from 'lucide-react'
import { PlayerSetup } from '@/components/game/PlayerSetup'
import { usePlayers, useScores } from '@/lib/game/store'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Board Games — The Board Game Suite' },
      { name: 'description', content: 'Koleksi board game interaktif untuk dimainkan bersama' },
    ],
  }),
  component: Index,
})

const GAMES = [
  { to: '/undercover', title: 'Undercover', desc: 'Cari pemain yang memegang kata berbeda.', Icon: Eye, accent: '#f29a55' },
  { to: '/werewolf', title: 'Werewolf', desc: 'Baca gerak-gerik desa sebelum malam tiba.', Icon: Skull, accent: '#79bfe0' },
  { to: '/spyfall', title: 'Spyfall', desc: 'Temukan mata-mata lewat pertanyaan cerdas.', Icon: MapPin, accent: '#55b9b0' },
  { to: '/bomb-party', title: 'Bomb Party', desc: 'Sebut kata dengan cepat sebelum waktunya habis.', Icon: Bomb, accent: '#f6c945' },
] as const

function Index() {
  const scores = useScores()
  const [players] = usePlayers()
  const [, setPlayers] = usePlayers()
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])

  return (
    <main className="dashboard-page">
      <div className="dashboard-frame">
        <header className="dashboard-header">
          <div>
            <div className="brand-mark"><span className="brand-dot" /> Coulstee game room</div>
            <h1 className="dashboard-title">Pick a game.<br />Make a story.</h1>
            <p className="dashboard-subtitle">Satu ruang untuk permainan singkat, keputusan seru, dan kompetisi kecil bersama teman.</p>
          </div>
          <div className="dashboard-stats" aria-label="Ringkasan dashboard">
            <div className="stat-card"><span className="stat-label">Pemain</span><strong className="stat-value">{players.length}</strong></div>
            <div className="stat-card"><span className="stat-label">Game</span><strong className="stat-value">{GAMES.length}</strong></div>
          </div>
        </header>

        <div className="dashboard-grid">
          <div className="dashboard-main">
            <section className="dashboard-panel players-panel">
              <PlayerSetup />
            </section>

            <section className="dashboard-panel games-panel">
              <div className="panel-heading games-heading"><div><span className="panel-kicker">Ruang bermain</span><h2 className="panel-title">Pilih permainan</h2></div><span className="game-count">{players.length} ready</span></div>
              <div className="games-grid">
                {GAMES.map(({ to, title, desc, Icon, accent }) => {
                  const isLocked = (to === '/werewolf' && players.length < 5) || (to === '/undercover' && players.length < 4)
                  const requirement = to === '/werewolf' ? '5' : '4'
                  const content = <>
                    <div className="game-card-top"><span className="game-icon" style={{ background: accent }}><Icon size={22} /></span><span className={`game-status ${isLocked ? 'locked' : ''}`}>{isLocked ? 'Locked' : 'Ready'}</span></div>
                    <div className="game-card-copy"><h3 className="game-title">{title}</h3><p className="game-description">{desc}</p>{isLocked && <p className="game-requirement">Butuh {requirement} pemain minimum</p>}</div>
                  </>
                  return isLocked ? <div key={to} className="game-card is-locked">{content}</div> : <Link key={to} to={to} className="game-card" style={{ '--card-accent': accent } as React.CSSProperties}>{content}</Link>
                })}
              </div>
            </section>
          </div>

          <aside className="leaderboard-column">
            <section className="leaderboard-panel">
              <div className="panel-heading"><h2 className="leaderboard-title"><Trophy size={18} /> Leaderboard</h2>{sorted.length > 0 && <button className="reset-button" onClick={() => { sessionStorage.removeItem('bgs.scores'); window.dispatchEvent(new Event('bgs.scores.update')) }}>Reset</button>}</div>
              <div className="score-list">{sorted.length === 0 ? <div className="empty-state">Belum ada poin. Mainkan game untuk mengisi papan skor.</div> : sorted.map(([name, points], index) => <div key={name} className="score-row"><div className="score-player"><span className="score-rank">{index + 1}</span><span>{name}</span></div><span className="score-points">{points} pts</span></div>)}</div>
            </section>
            <footer className="dashboard-footer"><p>Audio, getar, dan narasi siap menemani permainan.</p><button className="text-button" onClick={() => { localStorage.removeItem('bgs.players'); setPlayers([]) }}>Hapus semua pemain</button></footer>
          </aside>
        </div>
      </div>
    </main>
  )
}
