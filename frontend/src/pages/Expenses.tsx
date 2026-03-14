import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Transaction } from '../api/types'
import { formatUSD } from '../components/FormatUtils'
import './Expenses.css'

export function Expenses() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getTransactions({ limit: 200 })
      .then(setTransactions)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const expenses = transactions.filter((t) => t.type === 'expense')
  const totalSpend = expenses.reduce((sum, t) => sum + t.total_amount, 0)

  // Category breakdown
  const byCategory: Record<string, number> = {}
  for (const t of expenses) {
    const cat = t.category || 'uncategorized'
    byCategory[cat] = (byCategory[cat] || 0) + t.total_amount
  }
  const categories = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)

  if (loading) {
    return <div className="expenses"><div className="loading-text">Loading expenses...</div></div>
  }

  return (
    <div className="expenses">
      <header className="page-header">
        <h2 className="page-title">Expense Engine</h2>
        <span className="page-subtitle">
          {expenses.length} expense transactions imported
        </span>
      </header>

      {/* Summary */}
      <div className="expense-summary">
        <div className="summary-stat">
          <span className="stat-label">Total Spend</span>
          <span className="stat-value mono">{formatUSD(totalSpend)}</span>
        </div>
        <div className="summary-stat">
          <span className="stat-label">Categories</span>
          <span className="stat-value mono">{categories.length}</span>
        </div>
        <div className="summary-stat">
          <span className="stat-label">Avg per Transaction</span>
          <span className="stat-value mono">
            {expenses.length > 0 ? formatUSD(totalSpend / expenses.length) : '—'}
          </span>
        </div>
      </div>

      {/* Category Breakdown */}
      {categories.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 className="card-title">Spending by Category</h3>
          <div className="category-list">
            {categories.map(([category, amount]) => (
              <div key={category} className="category-row">
                <span className="category-name">{category}</span>
                <div className="category-bar-container">
                  <div
                    className="category-bar"
                    style={{ width: `${(amount / totalSpend) * 100}%` }}
                  />
                </div>
                <span className="category-amount mono">{formatUSD(amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction Table */}
      <div className="table-container">
        {transactions.length === 0 ? (
          <div className="empty-state">
            No transactions imported yet. Upload a CSV via POST /api/accounts/:id/import.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Account</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="mono muted">{tx.date}</td>
                  <td>{tx.description || tx.asset || '—'}</td>
                  <td>
                    {tx.category ? (
                      <span className="badge badge-blue">{tx.category}</span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${tx.type === 'expense' ? 'badge-red' : tx.type === 'income' ? 'badge-green' : 'badge-amber'}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="mono">{formatUSD(tx.total_amount)}</td>
                  <td className="muted">{tx.account_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
