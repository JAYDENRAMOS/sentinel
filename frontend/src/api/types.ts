export interface Account {
  id: number
  name: string
  type: 'brokerage' | 'crypto' | 'checking' | 'credit_card'
  institution: string
  last_import_date: string | null
}

export interface Holding {
  id: number
  account_id: number
  account_name: string
  institution: string
  asset: string
  quantity: number
  current_value: number
  cost_basis_total: number | null
  unrealized_gain_loss: number | null
}

export interface Transaction {
  id: number
  account_id: number
  account_name: string
  date: string
  type: string
  asset: string | null
  quantity: number | null
  price_per_unit: number | null
  total_amount: number
  category: string | null
  description: string | null
  source: string
}

export interface AssetClassBreakdown {
  asset_class: string
  value: number
  pct: number
}

export interface AccountSummary {
  id: number
  name: string
  type: string
  institution: string
  current_value: number
  cost_basis: number | null
  unrealized_gain_loss: number | null
  allocation_pct: number
  last_import_date: string | null
}

export interface NetWorth {
  total: number
  total_cost_basis: number | null
  total_unrealized_gain_loss: number | null
  btc_price: number | null
  accounts: AccountSummary[]
  by_asset_class: AssetClassBreakdown[]
}

export interface BTCPrice {
  usd: number
  usd_24h_change: number | null
  usd_market_cap: number | null
}

export interface ImportResult {
  success: boolean
  rows_in_file: number
  rows_parsed: number
  transactions_imported: number
  holdings_imported: number
  errors: string[]
}

export interface HealthStatus {
  status: string
  service: string
  version: string
  database: string
}

// Tax Brain types
export interface TaxLot {
  id: number
  account_id: number
  account_name: string
  asset: string
  quantity: number
  remaining_quantity: number
  cost_basis_per_unit: number
  total_cost_basis: number
  acquisition_date: string
  acquisition_method: string
  current_price: number | null
  current_value: number | null
  unrealized_gain_loss: number | null
  is_long_term: boolean
  days_held: number
  days_to_long_term: number | null
  long_term_date: string
  tax_savings_if_wait: number | null
}

export interface LotAgingAlert {
  lot_id: number
  asset: string
  account_name: string
  quantity: number
  days_to_long_term: number
  long_term_date: string
  unrealized_gain: number | null
  estimated_tax_savings: number | null
  urgency: '7d' | '14d' | '30d'
}

export interface HarvestCandidate {
  lot_id: number
  asset: string
  account_name: string
  quantity: number
  cost_basis: number
  current_value: number
  unrealized_loss: number
  is_long_term: boolean
  wash_sale_risk: boolean
  wash_sale_details: string | null
}

export interface BracketPosition {
  current_taxable_income: number
  current_bracket_rate: number
  remaining_in_bracket: number
  next_bracket_rate: number
  ltcg_rate: number
  ltcg_remaining_in_bracket: number
  next_ltcg_rate: number
}

export interface SaleModeling {
  method: string
  lots_used: SaleLotUsed[]
  total_proceeds: number
  total_cost_basis: number
  total_gain_loss: number
  short_term_gain: number
  long_term_gain: number
  estimated_tax: number
}

export interface SaleLotUsed {
  lot_id: number
  quantity: number
  cost_basis_per_unit: number
  cost_basis_total: number
  proceeds: number
  gain_loss: number
  acquisition_date: string
  is_long_term: boolean
  days_held: number
}

export interface QuarterlyEstimate {
  quarter: number
  due_date: string
  amount: number
  ytd_liability: number
}
