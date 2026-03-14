import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { TaxLot, LotAgingAlert, HarvestCandidate } from '../api/types'
import { formatUSD, gainLossClass } from '../components/FormatUtils'
import './TaxBrain.css'

export function TaxBrain() {
  const [lots, setLots] = useState<TaxLot[]>([])
  const [alerts, setAlerts] = useState<LotAgingAlert[]>([])
  const [candidates, setCandidates] = useState<HarvestCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'lots' | 'aging' | 'harvest' | 'bracket'>('lots')

  useEffect(() => {
    Promise.all([
      api.getTaxLots().catch(() => []),
      api.getLotAgingAlerts().catch(() => []),
      api.getHarvestCandidates().catch(() => []),
    ]).then(([l, a, c]) => {
      setLots(l)
      setAlerts(a)
      setCandidates(c)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return <div className="tax-brain"><div className="loading-text">Loading tax data...</div></div>
  }

  return (
    <div className="tax-brain">
      <header className="page-header">
        <h2 className="page-title">Tax Brain</h2>
        <span className="page-subtitle">
          Cost basis, lot aging, harvesting, and bracket optimization
        </span>
      </header>

      {/* Summary Bar */}
      <div className="tax-summary-bar">
        <div className="summary-stat">
          <span className="stat-label">Total Lots</span>
          <span className="stat-value mono">{lots.length}</span>
        </div>
        <div className="summary-stat">
          <span className="stat-label">Long-term</span>
          <span className="stat-value mono green">
            {lots.filter((l) => l.is_long_term).length}
          </span>
        </div>
        <div className="summary-stat">
          <span className="stat-label">Short-term</span>
          <span className="stat-value mono">
            {lots.filter((l) => !l.is_long_term).length}
          </span>
        </div>
        <div className="summary-stat">
          <span className="stat-label">Aging Alerts</span>
          <span className={`stat-value mono ${alerts.length > 0 ? 'amber' : ''}`}>
            {alerts.length}
          </span>
        </div>
        <div className="summary-stat">
          <span className="stat-label">Harvest Opportunities</span>
          <span className={`stat-value mono ${candidates.length > 0 ? 'green' : ''}`}>
            {candidates.length}
          </span>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="tab-nav">
        {(['lots', 'aging', 'harvest', 'bracket'] as const).map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'lots' && 'All Lots'}
            {tab === 'aging' && `Aging Alerts (${alerts.length})`}
            {tab === 'harvest' && `Harvest (${candidates.length})`}
            {tab === 'bracket' && 'Bracket Position'}
          </button>
        ))}
      </div>

      {/* Lot Table */}
      {activeTab === 'lots' && (
        <div className="table-container">
          {lots.length === 0 ? (
            <div className="empty-state">
              No tax lots tracked yet. Import brokerage CSVs or create lots manually via POST /api/tax/lots.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Account</th>
                  <th>Qty</th>
                  <th>Cost Basis</th>
                  <th>Current Value</th>
                  <th>Unrealized</th>
                  <th>Acquired</th>
                  <th>Days Held</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {lots.map((lot) => (
                  <tr key={lot.id}>
                    <td className="mono bold">{lot.asset}</td>
                    <td className="muted">{lot.account_name}</td>
                    <td className="mono">{lot.remaining_quantity.toFixed(4)}</td>
                    <td className="mono">{formatUSD(lot.total_cost_basis)}</td>
                    <td className="mono">{formatUSD(lot.current_value)}</td>
                    <td className={`mono ${gainLossClass(lot.unrealized_gain_loss)}`}>
                      {formatUSD(lot.unrealized_gain_loss)}
                    </td>
                    <td className="mono muted">{lot.acquisition_date}</td>
                    <td className="mono">{lot.days_held}d</td>
                    <td>
                      {lot.is_long_term ? (
                        <span className="badge badge-green">LONG-TERM</span>
                      ) : (
                        <span className="badge badge-amber">
                          ST ({lot.days_to_long_term}d to LT)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Aging Alerts */}
      {activeTab === 'aging' && (
        <div className="alerts-list">
          {alerts.length === 0 ? (
            <div className="empty-state">
              No lots approaching the long-term threshold.
            </div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.lot_id} className={`alert-card urgency-${alert.urgency}`}>
                <div className="alert-header">
                  <span className="alert-asset mono bold">{alert.asset}</span>
                  <span className={`badge badge-${alert.urgency === '7d' ? 'red' : alert.urgency === '14d' ? 'amber' : 'blue'}`}>
                    {alert.days_to_long_term} days to long-term
                  </span>
                </div>
                <div className="alert-body">
                  <div className="alert-detail">
                    <span className="label">Account</span>
                    <span>{alert.account_name}</span>
                  </div>
                  <div className="alert-detail">
                    <span className="label">Quantity</span>
                    <span className="mono">{alert.quantity.toFixed(4)}</span>
                  </div>
                  <div className="alert-detail">
                    <span className="label">Long-term Date</span>
                    <span className="mono">{alert.long_term_date}</span>
                  </div>
                  {alert.estimated_tax_savings != null && (
                    <div className="alert-detail highlight">
                      <span className="label">Tax Savings if You Wait</span>
                      <span className="mono green">{formatUSD(alert.estimated_tax_savings)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Harvest Candidates */}
      {activeTab === 'harvest' && (
        <div className="table-container">
          {candidates.length === 0 ? (
            <div className="empty-state">
              No tax-loss harvesting opportunities found.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Account</th>
                  <th>Qty</th>
                  <th>Cost Basis</th>
                  <th>Current Value</th>
                  <th>Harvestable Loss</th>
                  <th>Type</th>
                  <th>Wash Sale Risk</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.lot_id}>
                    <td className="mono bold">{c.asset}</td>
                    <td className="muted">{c.account_name}</td>
                    <td className="mono">{c.quantity.toFixed(4)}</td>
                    <td className="mono">{formatUSD(c.cost_basis)}</td>
                    <td className="mono">{formatUSD(c.current_value)}</td>
                    <td className="mono negative">{formatUSD(c.unrealized_loss)}</td>
                    <td>
                      <span className={`badge ${c.is_long_term ? 'badge-green' : 'badge-amber'}`}>
                        {c.is_long_term ? 'LT' : 'ST'}
                      </span>
                    </td>
                    <td>
                      {c.wash_sale_risk ? (
                        <span className="badge badge-red" title={c.wash_sale_details || ''}>
                          WASH SALE RISK
                        </span>
                      ) : (
                        <span className="badge badge-green">CLEAR</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Bracket Position */}
      {activeTab === 'bracket' && <BracketPositionPanel />}
    </div>
  )
}

function BracketPositionPanel() {
  const [income, setIncome] = useState('')
  const [position, setPosition] = useState<import('../api/types').BracketPosition | null>(null)

  const calculate = async () => {
    const w2 = parseFloat(income)
    if (isNaN(w2)) return
    try {
      const pos = await api.getBracketPosition({ w2_income: w2 })
      setPosition(pos)
    } catch {
      // ignore
    }
  }

  return (
    <div className="bracket-panel">
      <div className="bracket-input-row">
        <label>W-2 Income</label>
        <input
          type="number"
          className="input-field"
          placeholder="e.g. 150000"
          value={income}
          onChange={(e) => setIncome(e.target.value)}
        />
        <button className="btn-primary" onClick={calculate}>Calculate</button>
      </div>

      {position && (
        <div className="bracket-results">
          <div className="bracket-card">
            <h4>Ordinary Income</h4>
            <div className="bracket-detail">
              <span>Current Rate</span>
              <span className="mono">{(position.current_bracket_rate * 100).toFixed(0)}%</span>
            </div>
            <div className="bracket-detail">
              <span>Remaining in Bracket</span>
              <span className="mono green">{formatUSD(position.remaining_in_bracket)}</span>
            </div>
            <div className="bracket-detail">
              <span>Next Bracket</span>
              <span className="mono">{(position.next_bracket_rate * 100).toFixed(0)}%</span>
            </div>
          </div>

          <div className="bracket-card">
            <h4>Long-Term Capital Gains</h4>
            <div className="bracket-detail">
              <span>LTCG Rate</span>
              <span className="mono">{(position.ltcg_rate * 100).toFixed(0)}%</span>
            </div>
            <div className="bracket-detail">
              <span>Remaining at This Rate</span>
              <span className="mono green">{formatUSD(position.ltcg_remaining_in_bracket)}</span>
            </div>
            <div className="bracket-detail">
              <span>Next LTCG Rate</span>
              <span className="mono">{(position.next_ltcg_rate * 100).toFixed(0)}%</span>
            </div>
          </div>

          <div className="bracket-insight">
            You can realize {formatUSD(position.ltcg_remaining_in_bracket)} more in long-term gains
            and stay at the {(position.ltcg_rate * 100).toFixed(0)}% LTCG rate.
          </div>
        </div>
      )}
    </div>
  )
}
