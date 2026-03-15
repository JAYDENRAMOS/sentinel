import { useEffect, useState } from 'react'
import { formatUSD } from '../components/FormatUtils'
import './Alerts.css'

interface Alert {
  id: string
  type: string
  severity: 'urgent' | 'warning' | 'info'
  title: string
  message: string
  source_module: string
  amount: number | null
}

interface ValueUnlocked {
  year: number
  total_saved: number
  by_category: Array<{ category: string; total: number; count: number }>
}

export function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [valueUnlocked, setValueUnlocked] = useState<ValueUnlocked | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/alerts').then(r => r.json()).catch(() => []),
      fetch('/api/alerts/value-unlocked').then(r => r.json()).catch(() => null),
    ]).then(([a, vu]) => {
      setAlerts(a)
      setValueUnlocked(vu)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return <div className="alerts-page"><div className="loading-text">Loading alerts...</div></div>
  }

  const urgentAlerts = alerts.filter(a => a.severity === 'urgent')
  const warningAlerts = alerts.filter(a => a.severity === 'warning')

  return (
    <div className="alerts-page">
      <header className="page-header">
        <h2 className="page-title">Smart Alerts</h2>
        <span className="page-subtitle">
          Proactive intelligence from all modules
        </span>
      </header>

      {/* Alert Summary */}
      <div className="alert-summary">
        <div className="summary-stat">
          <span className="stat-label">Total Alerts</span>
          <span className="stat-value mono">{alerts.length}</span>
        </div>
        <div className="summary-stat">
          <span className="stat-label">Urgent</span>
          <span className={`stat-value mono ${urgentAlerts.length > 0 ? 'negative' : ''}`}>
            {urgentAlerts.length}
          </span>
        </div>
        <div className="summary-stat">
          <span className="stat-label">Warnings</span>
          <span className={`stat-value mono ${warningAlerts.length > 0 ? 'amber' : ''}`}>
            {warningAlerts.length}
          </span>
        </div>
        <div className="summary-stat">
          <span className="stat-label">Value Unlocked YTD</span>
          <span className="stat-value mono green">
            {formatUSD(valueUnlocked?.total_saved ?? 0)}
          </span>
        </div>
      </div>

      {/* Value Unlocked Breakdown */}
      {valueUnlocked && valueUnlocked.by_category.length > 0 && (
        <div className="card vu-card">
          <h3 className="card-title">Value Unlocked Breakdown</h3>
          <div className="vu-categories">
            {valueUnlocked.by_category.map((cat) => (
              <div key={cat.category} className="vu-row">
                <span className="vu-category">{cat.category.replace('_', ' ')}</span>
                <span className="vu-count">{cat.count}x</span>
                <span className="mono green">{formatUSD(cat.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alert Feed */}
      {alerts.length === 0 ? (
        <div className="empty-state">
          No alerts — all clear. Import data and track assets to start receiving proactive alerts.
        </div>
      ) : (
        <div className="alerts-feed">
          {alerts.map((alert) => (
            <div key={alert.id} className={`alert-item severity-${alert.severity}`}>
              <div className="alert-icon">
                {alert.severity === 'urgent' && '!!'}
                {alert.severity === 'warning' && '!'}
                {alert.severity === 'info' && 'i'}
              </div>
              <div className="alert-content">
                <div className="alert-top">
                  <span className="alert-title">{alert.title}</span>
                  <div className="alert-tags">
                    <span className={`badge badge-${alert.severity === 'urgent' ? 'red' : alert.severity === 'warning' ? 'amber' : 'blue'}`}>
                      {alert.type.replace('_', ' ')}
                    </span>
                    <span className="alert-source">{alert.source_module.replace('_', ' ')}</span>
                  </div>
                </div>
                <p className="alert-message">{alert.message}</p>
                {alert.amount != null && (
                  <span className="alert-amount mono green">{formatUSD(alert.amount)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
