import { useState, useEffect } from 'react'
import { api } from '../api/client'
import './CryptoConnect.css'

interface Props {
  onSync: () => void
}

export function CryptoConnect({ onSync }: Props) {
  const [coinbaseConfigured, setCoinbaseConfigured] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [btcAddress, setBtcAddress] = useState('')
  const [btcName, setBtcName] = useState('')
  const [tracking, setTracking] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    api.getCoinbaseStatus().then(s => setCoinbaseConfigured(s.configured)).catch(() => {})
  }, [])

  const handleCoinbaseSync = async () => {
    setSyncing(true)
    setMessage(null)
    try {
      const result = await api.syncCoinbase()
      setMessage(`Synced ${result.accounts_synced} accounts, ${result.holdings_synced} holdings, ${result.transactions_synced} transactions`)
      onSync()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sync failed'
      setMessage(msg)
    } finally {
      setSyncing(false)
    }
  }

  const handleTrackAddress = async () => {
    if (!btcAddress.trim()) return
    setTracking(true)
    setMessage(null)
    try {
      await api.trackBTCAddress(btcAddress.trim(), btcName.trim() || undefined)
      setMessage(`Tracking ${btcAddress.slice(0, 12)}...`)
      setBtcAddress('')
      setBtcName('')
      onSync()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to track address'
      setMessage(msg)
    } finally {
      setTracking(false)
    }
  }

  return (
    <div className="crypto-connect">
      <h4>Crypto Connections</h4>

      {/* Coinbase */}
      <div className="crypto-section">
        <div className="crypto-section-header">
          <span className="crypto-label">Coinbase</span>
          {coinbaseConfigured ? (
            <button className="btn-crypto" onClick={handleCoinbaseSync} disabled={syncing}>
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
          ) : (
            <span className="crypto-unconfigured">Not configured</span>
          )}
        </div>
        {!coinbaseConfigured && (
          <p className="crypto-hint">
            Set <code>SENTINEL_COINBASE_API_KEY</code> and <code>SENTINEL_COINBASE_API_SECRET</code> in your <code>.env</code>
          </p>
        )}
      </div>

      {/* On-chain BTC */}
      <div className="crypto-section">
        <div className="crypto-section-header">
          <span className="crypto-label">On-chain BTC</span>
        </div>
        <div className="btc-track-form">
          <input
            type="text"
            placeholder="BTC address (bc1..., 1..., 3...)"
            value={btcAddress}
            onChange={e => setBtcAddress(e.target.value)}
            className="input-crypto"
          />
          <input
            type="text"
            placeholder="Label (optional)"
            value={btcName}
            onChange={e => setBtcName(e.target.value)}
            className="input-crypto input-label"
          />
          <button className="btn-crypto" onClick={handleTrackAddress} disabled={tracking || !btcAddress.trim()}>
            {tracking ? 'Tracking...' : 'Track'}
          </button>
        </div>
        <p className="crypto-hint">Auto-refreshes every 4 hours via Mempool.space</p>
      </div>

      {message && <div className="crypto-message">{message}</div>}
    </div>
  )
}
