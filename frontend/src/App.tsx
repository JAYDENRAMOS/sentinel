import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { TaxBrain } from './pages/TaxBrain'
import { Expenses } from './pages/Expenses'
import { EmailIntel } from './pages/EmailIntel'
import { ScenarioLab } from './pages/ScenarioLab'
import { Alerts } from './pages/Alerts'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tax" element={<TaxBrain />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/email" element={<EmailIntel />} />
          <Route path="/scenarios" element={<ScenarioLab />} />
          <Route path="/alerts" element={<Alerts />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
