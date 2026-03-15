import { useEffect, useState } from 'react'
import { formatUSD } from '../components/FormatUtils'
import './EmailIntel.css'

interface EmailStatus {
  configured: boolean
  authenticated: boolean
}

interface WishlistItem {
  id: number
  item_description: string
  item_url: string | null
  target_price: number | null
  current_price: number | null
  lowest_price_ever: number | null
  alert_triggered: boolean
  priority: number
  added_date: string
}

export function EmailIntel() {
  const [status, setStatus] = useState<EmailStatus | null>(null)
  const [subscriptions, setSubscriptions] = useState<Array<{
    merchant: string; amount: number; frequency: string;
    annual_cost: number; status: string
  }>>([])
  const [wishlist, setWishlist] = useState<WishlistItem[]>([])
  const [subTotal, setSubTotal] = useState<{ annual_total: number; monthly_avg: number } | null>(null)
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'receipts' | 'wishlist' | 'setup'>('subscriptions')

  useEffect(() => {
    fetch('/api/email/status').then(r => r.json()).then(setStatus).catch(() => {})
    fetch('/api/email/subscriptions').then(r => r.json()).then(setSubscriptions).catch(() => {})
    fetch('/api/email/subscriptions/total').then(r => r.json()).then(setSubTotal).catch(() => {})
    fetch('/api/email/wishlist').then(r => r.json()).then(setWishlist).catch(() => {})
  }, [])

  return (
    <div className="email-intel">
      <header className="page-header">
        <h2 className="page-title">Email Intelligence</h2>
        <span className="page-subtitle">
          Receipts, subscriptions, price monitoring, and wishlist
        </span>
      </header>

      {/* Summary */}
      <div className="email-summary">
        <div className="summary-stat">
          <span className="stat-label">Gmail</span>
          <span className={`stat-value ${status?.authenticated ? 'green' : 'muted'}`}>
            {status?.authenticated ? 'Connected' : 'Not Connected'}
          </span>
        </div>
        <div className="summary-stat">
          <span className="stat-label">Subscriptions</span>
          <span className="stat-value mono">{subscriptions.length}</span>
        </div>
        <div className="summary-stat">
          <span className="stat-label">Annual Sub Cost</span>
          <span className="stat-value mono">{formatUSD(subTotal?.annual_total)}</span>
        </div>
        <div className="summary-stat">
          <span className="stat-label">Wishlist Items</span>
          <span className="stat-value mono">{wishlist.length}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-nav">
        {(['subscriptions', 'receipts', 'wishlist', 'setup'] as const).map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'subscriptions' && `Subscriptions (${subscriptions.length})`}
            {tab === 'receipts' && 'Receipts'}
            {tab === 'wishlist' && `Wishlist (${wishlist.length})`}
            {tab === 'setup' && 'Setup'}
          </button>
        ))}
      </div>

      {/* Subscriptions */}
      {activeTab === 'subscriptions' && (
        <div>
          {subscriptions.length === 0 ? (
            <div className="empty-state">
              No subscriptions detected yet. Import expense data first, then run POST /api/email/detect-subscriptions.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Merchant</th>
                  <th>Amount</th>
                  <th>Frequency</th>
                  <th>Annual Cost</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub, i) => (
                  <tr key={i}>
                    <td className="bold">{sub.merchant}</td>
                    <td className="mono">{formatUSD(sub.amount)}</td>
                    <td>{sub.frequency}</td>
                    <td className="mono">{formatUSD(sub.annual_cost)}</td>
                    <td>
                      <span className={`badge ${sub.status === 'price_increased' ? 'badge-amber' : 'badge-green'}`}>
                        {sub.status === 'price_increased' ? 'PRICE UP' : 'ACTIVE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="bold">Total Annual</td>
                  <td className="mono bold">{formatUSD(subTotal?.annual_total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* Receipts */}
      {activeTab === 'receipts' && (
        <div className="empty-state">
          {status?.authenticated
            ? 'Run POST /api/email/scan-receipts to scan your inbox for receipts.'
            : 'Connect Gmail first to scan for receipts.'}
        </div>
      )}

      {/* Wishlist */}
      {activeTab === 'wishlist' && (
        <div>
          {wishlist.length === 0 ? (
            <div className="empty-state">
              No wishlist items. Add via POST /api/email/wishlist.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Target Price</th>
                  <th>Current Price</th>
                  <th>Lowest Ever</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {wishlist.map((item) => (
                  <tr key={item.id}>
                    <td className="bold">{item.item_description}</td>
                    <td className="mono">{formatUSD(item.target_price)}</td>
                    <td className="mono">{formatUSD(item.current_price)}</td>
                    <td className="mono green">{formatUSD(item.lowest_price_ever)}</td>
                    <td className="mono">{item.priority}</td>
                    <td>
                      {item.alert_triggered ? (
                        <span className="badge badge-green">TARGET HIT</span>
                      ) : (
                        <span className="badge badge-blue">WATCHING</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Setup */}
      {activeTab === 'setup' && (
        <div className="setup-panel">
          <div className="card">
            <h3 className="card-title">Gmail Connection</h3>
            <div className="setup-steps">
              <div className="step">
                <span className="step-number">1</span>
                <span>Create a Google Cloud project and enable the Gmail API</span>
              </div>
              <div className="step">
                <span className="step-number">2</span>
                <span>Create OAuth2 credentials (Desktop application type)</span>
              </div>
              <div className="step">
                <span className="step-number">3</span>
                <span>POST /api/email/setup with your client_id and client_secret</span>
              </div>
              <div className="step">
                <span className="step-number">4</span>
                <span>Visit the auth URL, authorize, and POST the code to /api/email/authenticate</span>
              </div>
            </div>
            <div className="setup-status">
              <div className="detail-row">
                <span className="label">Credentials</span>
                <span className={`mono ${status?.configured ? 'green' : 'muted'}`}>
                  {status?.configured ? 'Configured' : 'Not set'}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Authentication</span>
                <span className={`mono ${status?.authenticated ? 'green' : 'muted'}`}>
                  {status?.authenticated ? 'Connected' : 'Not authenticated'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
