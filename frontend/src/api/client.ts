const BASE = ''

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${res.status}: ${body}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  health: () => request<import('./types').HealthStatus>('/health'),

  // Accounts
  getAccounts: () => request<import('./types').Account[]>('/api/accounts'),
  createAccount: (data: { name: string; type: string; institution: string }) =>
    request<import('./types').Account>('/api/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Portfolio
  getNetWorth: () => request<import('./types').NetWorth>('/api/portfolio/net-worth'),
  getHoldings: () => request<import('./types').Holding[]>('/api/portfolio/holdings'),
  getTransactions: (params?: { limit?: number; offset?: number; account_id?: number }) => {
    const search = new URLSearchParams()
    if (params?.limit) search.set('limit', String(params.limit))
    if (params?.offset) search.set('offset', String(params.offset))
    if (params?.account_id) search.set('account_id', String(params.account_id))
    const qs = search.toString()
    return request<import('./types').Transaction[]>(`/api/portfolio/transactions${qs ? `?${qs}` : ''}`)
  },

  // BTC
  getBTCPrice: () => request<import('./types').BTCPrice>('/api/btc/price'),
  getBTCAddress: (address: string) => request<unknown>(`/api/btc/address/${address}`),
  trackBTCAddress: (address: string, name?: string) => {
    const params = new URLSearchParams({ address })
    if (name) params.set('account_name', name)
    return request<unknown>(`/api/btc/track-address?${params}`, { method: 'POST' })
  },

  // Tax
  getTaxLots: (params?: { asset?: string; account_id?: number }) => {
    const search = new URLSearchParams()
    if (params?.asset) search.set('asset', params.asset)
    if (params?.account_id) search.set('account_id', String(params.account_id))
    const qs = search.toString()
    return request<import('./types').TaxLot[]>(`/api/tax/lots${qs ? `?${qs}` : ''}`)
  },
  getLotAgingAlerts: () => request<import('./types').LotAgingAlert[]>('/api/tax/lot-aging-alerts'),
  getHarvestCandidates: (minLoss = 100) =>
    request<import('./types').HarvestCandidate[]>(`/api/tax/harvest-candidates?min_loss=${minLoss}`),
  getBracketPosition: (params: { w2_income: number; ytd_st_gains?: number; ytd_lt_gains?: number; ytd_losses?: number }) => {
    const search = new URLSearchParams({ w2_income: String(params.w2_income) })
    if (params.ytd_st_gains) search.set('ytd_st_gains', String(params.ytd_st_gains))
    if (params.ytd_lt_gains) search.set('ytd_lt_gains', String(params.ytd_lt_gains))
    if (params.ytd_losses) search.set('ytd_losses', String(params.ytd_losses))
    return request<import('./types').BracketPosition>(`/api/tax/bracket-position?${search}`)
  },
  modelSale: (params: { asset: string; quantity: number; sale_price: number; method?: string }) => {
    const search = new URLSearchParams({
      asset: params.asset,
      quantity: String(params.quantity),
      sale_price: String(params.sale_price),
    })
    if (params.method) search.set('method', params.method)
    return request<import('./types').SaleModeling>(`/api/tax/model-sale?${search}`)
  },
  compareSaleMethods: (params: { asset: string; quantity: number; sale_price: number }) => {
    const search = new URLSearchParams({
      asset: params.asset,
      quantity: String(params.quantity),
      sale_price: String(params.sale_price),
    })
    return request<Record<string, { total_gain_loss: number; short_term_gain: number; long_term_gain: number; estimated_tax: number }>>(`/api/tax/compare-methods?${search}`)
  },
  getYTDRealized: (taxYear?: number) => {
    const qs = taxYear ? `?tax_year=${taxYear}` : ''
    return request<{ tax_year: number; net_realized: number; realized_short_term_gains: number; realized_long_term_gains: number }>(`/api/tax/ytd-realized${qs}`)
  },
  getQuarterlyEstimates: (params: { w2_income: number; ytd_realized_gains?: number; prior_year_tax?: number }) => {
    const search = new URLSearchParams({ w2_income: String(params.w2_income) })
    if (params.ytd_realized_gains) search.set('ytd_realized_gains', String(params.ytd_realized_gains))
    if (params.prior_year_tax) search.set('prior_year_tax', String(params.prior_year_tax))
    return request<import('./types').QuarterlyEstimate[]>(`/api/tax/quarterly-estimates?${search}`)
  },

  // Coinbase
  getCoinbaseStatus: () => request<{ configured: boolean }>('/api/coinbase/status'),
  syncCoinbase: () => request<{ accounts_synced: number; holdings_synced: number; transactions_synced: number }>('/api/coinbase/sync', { method: 'POST' }),

  // Import
  importCSV: async (accountId: number, file: File): Promise<import('./types').ImportResult> => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${BASE}/api/accounts/${accountId}/import`, {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`${res.status}: ${body}`)
    }
    return res.json() as Promise<import('./types').ImportResult>
  },
}
