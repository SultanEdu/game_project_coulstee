import { createFileRoute, Link } from '@tanstack/react-router'
import { PlayerSetup } from '@/components/game/PlayerSetup'
import { useScores, usePlayers } from '@/lib/game/store'
import { Trophy, Skull, Eye, MapPin, Bomb, RotateCcw } from 'lucide-react'

export const Route = createFileRoute('/({
  head: () => ({
    meta: [
      { title: 'Board Games — The Board Game Suite' },
      { name: 'description', content: 'Koleksi board game interaktif untuk dimainkan bersama' },
    ],
  }),
  component: Index,
})

const GAMES = [
  { to: '/undercover', title: 'Undercover', desc: 'Civilian vs Undercover vs Mr. White', Icon: Eye },
  { to: '/werewolf', title: 'Werewolf', desc: 'Malam tiba. Siapa serigalanya?', Icon: Skull },
  { to: '/spyfall', title: 'Spyfall', desc: 'Temukan sang mata-mata', Icon: MapPin },
  { to: '/bomb-party', title: 'Bomb Party', desc: 'Sebut kata sebelum meledak', Icon: Bomb },
] as const

function Index() {
  const scores = useScores()
  const [players] = usePlayers()
  const [, setPlayers] = usePlayers()
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])

  return (
    <div className="min-h-screen bg-gradient-to-b from-mahogany-deep via-mahogany-deep to-mahogany" style={{
      backgroundImage: `
        radial-gradient(at 20% 10%, oklch(0.22 0.06 30 / 0.5) 0%, transparent 55%),
        radial-gradient(at 80% 90%, oklch(0.18 0.05 25 / 0.55) 0%, transparent 60%),
        repeating-linear-gradient(45deg, oklch(0 0 0 / 0.05) 0 2px, transparent 2px 8px)
      `,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'top',
    }}>
      <main className="w-full px-4 py-8 max-w-6xl mx-auto">
        {/* Header */}
        <header className="text-center mb-12 animate-fade-in-up">
          <p className="text-gold/70 text-xs tracking-[0.4em] font-sans uppercase mb-2">— Coulstee —</p>
          <h1 className="font-display text-5xl md:text-6xl text-gold leading-tight font-bold">
            Board Games
          </h1>
          <div className="gold-divider my-6 max-w-md mx-auto" />
          <p className="text-parchment/80 font-serif-elegant italic">Permainan papan interaktif untuk dimainkan bersama</p>
        </header>

        {/* Player Setup */}
        <section className="mb-12 animate-fade-in-up" style={{ animationDelay: '60ms' }}>
          <PlayerSetup />
        </section>

        {/* Games Grid */}
        <section className="mb-12 animate-fade-in-up" style={{ animationDelay: '120ms' }}>
          <h2 className="font-display text-gold text-lg tracking-[0.3em] uppercase mb-6 text-center">Pilih Permainan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {GAMES.map(({ to, title, desc, Icon }, i) => {
              const isWerewolf = to === '/werewolf'
              const isUndercover = to === '/undercover'
              const isLocked = (isWerewolf && players.length < 5) || (isUndercover && players.length < 4)

              return (
                <div
                  key={to}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${120 + i * 60}ms` }}
                >
                  {isLocked ? (
                    <div className="parchment-card rounded-xl p-6 flex flex-col items-center text-center h-full justify-center opacity-60 cursor-not-allowed hover:opacity-60 transition-opacity">
                      <Icon className="h-12 w-12 text-mahogany-deep mb-3" />
                      <h3 className="font-display text-ink font-bold text-lg mb-1">{title}</h3>
                      <p className="text-destructive text-sm font-bold mb-2">
                        {isWerewolf ? '5+ pemain' : '4+ pemain'}
                      </p>
                      <p className="text-ink/60 text-xs">{desc}</p>
                    </div>
                  ) : (
                    <Link
                      to={to}
                      className="parchment-card rounded-xl p-6 flex flex-col items-center text-center h-full justify-center transition-all duration-200 hover:shadow-lg hover:-translate-y-1 active:scale-95 cursor-pointer group"
                    >
                      <div className="group-hover:scale-110 transition-transform duration-200">
                        <Icon className="h-12 w-12 text-mahogany-deep mb-3" />
                      </div>
                      <h3 className="font-display text-ink font-bold text-lg mb-1 group-hover:text-mahogany transition-colors">{title}</h3>
                      <p className="text-ink/60 text-xs leading-snug">{desc}</p>
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Leaderboard */}
        <section
          className="parchment-card rounded-xl p-6 animate-fade-in-up"
          style={{ animationDelay: '300ms' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl flex items-center gap-3 text-ink font-bold">
              <Trophy className="h-6 w-6" /> Leaderboard Sesi
            </h2>
            {sorted.length > 0 && (
              <button
                onClick={() => {
                  sessionStorage.removeItem('bgs.scores')
                  window.dispatchEvent(new Event('bgs.scores.update'))
                }}
                className="text-ink/60 inline-flex items-center gap-2 text-sm hover:text-ink transition-colors bg-mahogany/10 px-3 py-1 rounded-full"
              >
                <RotateCcw className="h-4 w-4" /> Reset
              </button>
            )}
          </div>
          <div className="border-t border-ink/20 pt-4">
            {sorted.length === 0 ? (
              <p className="text-ink/50 italic text-center py-8">Belum ada poin. Mainkan game untuk mengukir nama Anda di leaderboard.</p>
            ) : (
              <ol className="space-y-2">
                {sorted.map(([name, pts], i) => (
                  <li key={name} className="flex justify-between items-center py-3 px-4 bg-mahogany/10 rounded-lg hover:bg-mahogany/20 transition-colors">
                    <span className="flex items-center gap-3">
                      <span className="font-display text-gold text-lg font-bold w-8 text-center">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                      </span>
                      <span className="font-serif-elegant text-ink font-semibold">{name}</span>
                    </span>
                    <span className="font-display text-gold font-bold">{pts} pts</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center mt-16 pt-8 border-t border-parchment/20 text-parchment/60 text-sm italic animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <p className="mb-4">🔊 Suara, getar & narasi diaktifkan — pastikan volume HP menyala</p>
          <button 
            onClick={() => { localStorage.removeItem('bgs.players'); setPlayers([]) }} 
            className="text-parchment/60 hover:text-parchment transition-colors underline underline-offset-2"
          >
            Hapus semua pemain
          </button>
        </footer>
      </main>
    </div>
  )
}
