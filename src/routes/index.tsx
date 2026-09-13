import { createFileRoute, Link } from '@tanstack/react-router'
import { PlayerSetup } from '@/components/game/PlayerSetup'
import { useScores, usePlayers } from '@/lib/game/store'
import { Trophy, Skull, Eye, MapPin, Bomb, RotateCcw } from 'lucide-react'

export const Route = createFileRoute('/')( {
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
    <main className="min-h-screen px-4 py-8 max-w-xl mx-auto">
      <header className="text-center mb-8 animate-fade-in-up">
        <p className="text-gold/70 text-xs tracking-[0.4em] font-sans uppercase">— Coulstee —</p>
        <h1 className="font-display text-4xl md:text-5xl text-gold mt-2 leading-tight">
          Board Games<br />
        </h1>
        <div className="gold-divider my-4" />
      </header>

      <PlayerSetup />

      <section className="mt-8 contain-scroll">
        <h2 className="font-display text-gold text-sm tracking-[0.3em] uppercase mb-3">Pilih Permainan</h2>
        <div className="grid grid-cols-2 gap-3">
          {GAMES.map(({ to, title, desc, Icon }, i) => {
            const isWerewolf = to === '/werewolf'
            const isUndercover = to === '/undercover'
            const isLocked = (isWerewolf && players.length < 5) || (isUndercover && players.length < 4)

            return (
              <div
                key={to}
                className="animate-fade-in-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {isLocked ? (
                  <div className="relative parchment-card rounded-lg p-4 flex flex-col items-center text-center min-h-[140px] justify-center gap-2 opacity-60 contain-scroll">
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backgroundImage: `
                          radial-gradient(circle at 5% 5%, gray 2px, transparent 2px),
                          radial-gradient(circle at 95% 5%, gray 2px, transparent 2px),
                          radial-gradient(circle at 5% 95%, gray 2px, transparent 2px),
                          radial-gradient(circle at 95% 95%, gray 2px, transparent 2px)
                        `,
                        backgroundSize: '100% 100%',
                        backgroundRepeat: 'no-repeat',
                      }}
                    />
                    <Icon className="h-7 w-7 text-mahogany-deep relative z-10" />
                    <h3 className="font-display text-lg text-ink relative z-10">{title}</h3>
                    <p className="text-destructive text-[11px] font-bold leading-tight relative z-10">
                      {isWerewolf ? 'Minimal 5 pemain' : 'Minimal 4 pemain'}
                    </p>
                  </div>
                ) : (
                  <Link
                    to={to}
                    className="parchment-card rounded-lg p-4 flex flex-col items-center text-center min-h-[140px] justify-center gap-2 transition-transform active:scale-95 hover:-translate-y-0.5 group"
                  >
                    <Icon className="h-7 w-7 text-mahogany-deep" />
                    <h3 className="font-display text-lg text-ink">{title}</h3>
                    <p className="text-[11px] italic text-ink/60 leading-tight">{desc}</p>
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section
        className="mt-8 parchment-card rounded-lg p-5 contain-scroll animate-fade-in-up"
        style={{ animationDelay: '300ms' }}
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display text-lg flex items-center gap-2 text-ink">
            <Trophy className="h-5 w-5" /> Leaderboard Sesi
          </h2>
          {sorted.length > 0 && (
            <button
              onClick={() => {
                sessionStorage.removeItem('bgs.scores')
                window.dispatchEvent(new Event('bgs.scores.update'))
              }}
              className="text-ink/60 inline-flex items-center gap-1 text-xs hover:text-ink transition-colors"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          )}
        </div>
        {sorted.length === 0 ? (
          <p className="text-ink/50 italic text-sm">Belum ada poin. Mainkan game untuk mengukir nama.</p>
        ) : (
          <ol className="space-y-1">
            {sorted.map(([name, pts], i) => (
              <li key={name} className="flex justify-between items-center font-serif-elegant text-ink">
                <span>
                  <span className="font-display text-gold-bright mr-2">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                  </span>
                  {name}
                </span>
                <span className="font-display">{pts} pts</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <footer className="text-center mt-10 text-foreground/40 text-xs italic animate-fade-in-up" style={{ animationDelay: '400ms' }}>
        Suara, getar & narasi diaktifkan — pastikan volume HP menyala
        <button onClick={() => { localStorage.removeItem('bgs.players'); setPlayers([]) }} className="block mx-auto mt-2 underline">
          Hapus semua pemain
        </button>
      </footer>
    </main>
  )
}
