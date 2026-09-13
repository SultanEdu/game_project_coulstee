import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Index from './routes/Index'
import Werewolf from './routes/Werewolf'
import Undercover from './routes/Undercover'
import Spyfall from './routes/Spyfall'
import BombParty from './routes/BombParty'
import NotFound from './routes/NotFound'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/werewolf" element={<Werewolf />} />
        <Route path="/undercover" element={<Undercover />} />
        <Route path="/spyfall" element={<Spyfall />} />
        <Route path="/bomb-party" element={<BombParty />} />
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Router>
  )
}

export default App
