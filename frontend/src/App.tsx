import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { TaxBrain } from './pages/TaxBrain'
import { Expenses } from './pages/Expenses'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tax" element={<TaxBrain />} />
          <Route path="/expenses" element={<Expenses />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
