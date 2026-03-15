import { useState } from 'react'
import { formatUSD } from '../components/FormatUtils'
import './ScenarioLab.css'

export function ScenarioLab() {
  const [activeTab, setActiveTab] = useState<'sale' | 'expense' | 'taxyear'>('sale')

  return (
    <div className="scenario-lab">
      <header className="page-header">
        <h2 className="page-title">Scenario Lab</h2>
        <span className="page-subtitle">
          "What if?" modeling — simulate before you act
        </span>
      </header>

      <div className="tab-nav">
        {(['sale', 'expense', 'taxyear'] as const).map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'sale' && 'Simulate Sale'}
            {tab === 'expense' && 'Cut Expense'}
            {tab === 'taxyear' && 'Tax Year Planner'}
          </button>
        ))}
      </div>

      {activeTab === 'sale' && <SaleSimulator />}
      {activeTab === 'expense' && <ExpenseCutter />}
      {activeTab === 'taxyear' && <TaxYearPlanner />}
    </div>
  )
}

function SaleSimulator() {
  const [asset, setAsset] = useState('')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [income, setIncome] = useState('')
  const [result, setResult] = useState<Record<string, unknown> | null>(null)

  const simulate = async () => {
    const params = new URLSearchParams({
      asset, quantity, sale_price: price,
    })
    if (income) params.set('w2_income', income)
    const res = await fetch(`/api/scenarios/simulate-sale?${params}`)
    setResult(await res.json())
  }

  const comparisons = result?.comparisons as Record<string, {
    total_proceeds: number; total_cost_basis: number; total_gain_loss: number;
    estimated_tax: number; after_tax_proceeds: number;
    short_term_gain: number; long_term_gain: number;
  }> | undefined

  return (
    <div className="simulator-panel">
      <div className="input-grid">
        <div className="input-group">
          <label>Asset</label>
          <input className="input-field" placeholder="BTC, AAPL, VTI..." value={asset} onChange={e => setAsset(e.target.value)} />
        </div>
        <div className="input-group">
          <label>Quantity</label>
          <input className="input-field" type="number" placeholder="0.5" value={quantity} onChange={e => setQuantity(e.target.value)} />
        </div>
        <div className="input-group">
          <label>Sale Price</label>
          <input className="input-field" type="number" placeholder="85000" value={price} onChange={e => setPrice(e.target.value)} />
        </div>
        <div className="input-group">
          <label>W-2 Income (optional)</label>
          <input className="input-field" type="number" placeholder="150000" value={income} onChange={e => setIncome(e.target.value)} />
        </div>
      </div>
      <button className="btn-primary" onClick={simulate}>Simulate Sale</button>

      {comparisons && (
        <div className="comparison-grid">
          {Object.entries(comparisons).map(([method, data]) => (
            <div key={method} className={`comparison-card ${method === (result?.best_method as string) ? 'best' : ''}`}>
              <div className="comparison-header">
                <h4>{method}</h4>
                {method === (result?.best_method as string) && <span className="badge badge-green">BEST</span>}
              </div>
              <div className="comparison-details">
                <div className="detail-row">
                  <span>Proceeds</span>
                  <span className="mono">{formatUSD(data.total_proceeds)}</span>
                </div>
                <div className="detail-row">
                  <span>Cost Basis</span>
                  <span className="mono">{formatUSD(data.total_cost_basis)}</span>
                </div>
                <div className="detail-row">
                  <span>Gain/Loss</span>
                  <span className={`mono ${data.total_gain_loss >= 0 ? 'positive' : 'negative'}`}>
                    {formatUSD(data.total_gain_loss)}
                  </span>
                </div>
                <div className="detail-row">
                  <span>ST Gain</span>
                  <span className="mono">{formatUSD(data.short_term_gain)}</span>
                </div>
                <div className="detail-row">
                  <span>LT Gain</span>
                  <span className="mono">{formatUSD(data.long_term_gain)}</span>
                </div>
                <div className="detail-row highlight-row">
                  <span>Est. Tax</span>
                  <span className="mono negative">{formatUSD(data.estimated_tax)}</span>
                </div>
                <div className="detail-row highlight-row">
                  <span>After-tax</span>
                  <span className="mono bold">{formatUSD(data.after_tax_proceeds)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface ExpenseResult {
  monthly_amount: number
  annual_savings: number
  pre_tax_cost: number
  hours_of_work: number
  invested_1yr: number
  invested_5yr: number
  invested_10yr: number
  btc_equivalent: number | null
}

function ExpenseCutter() {
  const [amount, setAmount] = useState('')
  const [salary, setSalary] = useState('')
  const [result, setResult] = useState<ExpenseResult | null>(null)

  const calculate = async () => {
    const params = new URLSearchParams({ monthly_amount: amount })
    if (salary) params.set('annual_salary', salary)
    const res = await fetch(`/api/scenarios/cut-expense?${params}`)
    setResult(await res.json())
  }

  return (
    <div className="simulator-panel">
      <div className="input-grid">
        <div className="input-group">
          <label>Monthly Amount</label>
          <input className="input-field" type="number" placeholder="49.99" value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
        <div className="input-group">
          <label>Annual Salary (optional)</label>
          <input className="input-field" type="number" placeholder="150000" value={salary} onChange={e => setSalary(e.target.value)} />
        </div>
      </div>
      <button className="btn-primary" onClick={calculate}>Calculate Impact</button>

      {result && (
        <div className="result-cards">
          <div className="result-card">
            <span className="result-label">Annual Savings</span>
            <span className="result-value green">{formatUSD(result.annual_savings)}</span>
          </div>
          <div className="result-card">
            <span className="result-label">Pre-tax Cost</span>
            <span className="result-value">{formatUSD(result.pre_tax_cost)}</span>
            <span className="result-note">What you had to earn to pay for this</span>
          </div>
          {result.hours_of_work > 0 && (
            <div className="result-card">
              <span className="result-label">Hours of Work / Year</span>
              <span className="result-value">{result.hours_of_work.toFixed(1)}h</span>
            </div>
          )}
          <div className="result-card">
            <span className="result-label">Invested (5yr @ 8%)</span>
            <span className="result-value green">{formatUSD(result.invested_5yr)}</span>
          </div>
          <div className="result-card">
            <span className="result-label">Invested (10yr @ 8%)</span>
            <span className="result-value green">{formatUSD(result.invested_10yr)}</span>
          </div>
          {result.btc_equivalent != null && (
            <div className="result-card btc-card">
              <span className="result-label">BTC Equivalent / Year</span>
              <span className="result-value amber">{result.btc_equivalent.toFixed(6)} BTC</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TaxYearPlanner() {
  const [income, setIncome] = useState('')
  const [stGains, setStGains] = useState('')
  const [ltGains, setLtGains] = useState('')
  const [losses, setLosses] = useState('')
  const [result, setResult] = useState<{
    gross_income: number; standard_deduction: number; taxable_income: number;
    ordinary_tax: number; ltcg_tax: number; niit: number; total_tax: number;
    effective_rate: number; marginal_rate: number; ltcg_rate: number;
    remaining_in_bracket: number;
  } | null>(null)

  const calculate = async () => {
    const params = new URLSearchParams({ w2_income: income })
    if (stGains) params.set('short_term_gains', stGains)
    if (ltGains) params.set('long_term_gains', ltGains)
    if (losses) params.set('realized_losses', losses)
    const res = await fetch(`/api/scenarios/tax-year-model?${params}`)
    setResult(await res.json())
  }

  return (
    <div className="simulator-panel">
      <div className="input-grid">
        <div className="input-group">
          <label>W-2 Income</label>
          <input className="input-field" type="number" placeholder="150000" value={income} onChange={e => setIncome(e.target.value)} />
        </div>
        <div className="input-group">
          <label>Short-term Gains</label>
          <input className="input-field" type="number" placeholder="0" value={stGains} onChange={e => setStGains(e.target.value)} />
        </div>
        <div className="input-group">
          <label>Long-term Gains</label>
          <input className="input-field" type="number" placeholder="0" value={ltGains} onChange={e => setLtGains(e.target.value)} />
        </div>
        <div className="input-group">
          <label>Realized Losses</label>
          <input className="input-field" type="number" placeholder="0" value={losses} onChange={e => setLosses(e.target.value)} />
        </div>
      </div>
      <button className="btn-primary" onClick={calculate}>Model Tax Year</button>

      {result && (
        <div className="tax-model-results">
          <div className="model-row">
            <span>Gross Income</span>
            <span className="mono">{formatUSD(result.gross_income)}</span>
          </div>
          <div className="model-row muted-row">
            <span>Standard Deduction</span>
            <span className="mono">-{formatUSD(result.standard_deduction)}</span>
          </div>
          <div className="model-row">
            <span>Taxable Income</span>
            <span className="mono bold">{formatUSD(result.taxable_income)}</span>
          </div>
          <div className="model-divider" />
          <div className="model-row">
            <span>Ordinary Tax</span>
            <span className="mono">{formatUSD(result.ordinary_tax)}</span>
          </div>
          <div className="model-row">
            <span>LTCG Tax</span>
            <span className="mono">{formatUSD(result.ltcg_tax)}</span>
          </div>
          {result.niit > 0 && (
            <div className="model-row">
              <span>NIIT (3.8%)</span>
              <span className="mono">{formatUSD(result.niit)}</span>
            </div>
          )}
          <div className="model-divider" />
          <div className="model-row total-row">
            <span>Total Tax</span>
            <span className="mono negative bold">{formatUSD(result.total_tax)}</span>
          </div>
          <div className="model-row">
            <span>Effective Rate</span>
            <span className="mono">{(result.effective_rate * 100).toFixed(1)}%</span>
          </div>
          <div className="model-row">
            <span>Marginal Rate</span>
            <span className="mono">{(result.marginal_rate * 100).toFixed(0)}%</span>
          </div>
          <div className="model-insight">
            You can realize {formatUSD(result.remaining_in_bracket)} more in ordinary income
            before hitting the {((result.marginal_rate) * 100).toFixed(0)}% bracket ceiling.
          </div>
        </div>
      )}
    </div>
  )
}
