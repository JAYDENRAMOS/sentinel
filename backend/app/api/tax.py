from fastapi import APIRouter, Query
from fastapi.responses import PlainTextResponse
from typing import Optional
from app.services import tax_engine, btc_service
from app.database import get_db

router = APIRouter(tags=["tax"])


@router.get("/tax/lots")
async def list_lots(
    asset: Optional[str] = None,
    account_id: Optional[int] = None,
):
    """Get all active tax lots with computed fields."""
    prices = await _get_current_prices()
    lots = tax_engine.get_all_lots(asset=asset, account_id=account_id, prices=prices)
    return [
        {
            "id": l.id,
            "account_id": l.account_id,
            "account_name": l.account_name,
            "asset": l.asset,
            "quantity": l.quantity,
            "remaining_quantity": l.remaining_quantity,
            "cost_basis_per_unit": l.cost_basis_per_unit,
            "total_cost_basis": l.total_cost_basis,
            "acquisition_date": l.acquisition_date,
            "acquisition_method": l.acquisition_method,
            "current_price": l.current_price,
            "current_value": l.current_value,
            "unrealized_gain_loss": l.unrealized_gain_loss,
            "is_long_term": l.is_long_term,
            "days_held": l.days_held,
            "days_to_long_term": l.days_to_long_term,
            "long_term_date": l.long_term_date,
            "tax_savings_if_wait": l.tax_savings_if_wait,
        }
        for l in lots
    ]


@router.get("/tax/lot-aging-alerts")
async def lot_aging_alerts():
    """Get alerts for lots approaching long-term threshold."""
    prices = await _get_current_prices()
    alerts = tax_engine.get_lot_aging_alerts(prices=prices)
    return [
        {
            "lot_id": a.lot_id,
            "asset": a.asset,
            "account_name": a.account_name,
            "quantity": a.quantity,
            "days_to_long_term": a.days_to_long_term,
            "long_term_date": a.long_term_date,
            "unrealized_gain": a.unrealized_gain,
            "estimated_tax_savings": a.estimated_tax_savings,
            "urgency": a.urgency,
        }
        for a in alerts
    ]


@router.get("/tax/harvest-candidates")
async def harvest_candidates(min_loss: float = Query(100.0)):
    """Find tax-loss harvesting opportunities."""
    prices = await _get_current_prices()
    candidates = tax_engine.find_harvest_candidates(prices=prices, min_loss=min_loss)
    return [
        {
            "lot_id": c.lot_id,
            "asset": c.asset,
            "account_name": c.account_name,
            "quantity": c.quantity,
            "cost_basis": c.cost_basis,
            "current_value": c.current_value,
            "unrealized_loss": c.unrealized_loss,
            "is_long_term": c.is_long_term,
            "wash_sale_risk": c.wash_sale_risk,
            "wash_sale_details": c.wash_sale_details,
        }
        for c in candidates
    ]


@router.get("/tax/bracket-position")
def bracket_position(
    w2_income: float = Query(...),
    ytd_st_gains: float = Query(0),
    ytd_lt_gains: float = Query(0),
    ytd_losses: float = Query(0),
):
    """Show current position within tax brackets."""
    pos = tax_engine.get_bracket_position(
        w2_income=w2_income,
        ytd_st_gains=ytd_st_gains,
        ytd_lt_gains=ytd_lt_gains,
        ytd_losses=ytd_losses,
    )
    return {
        "current_taxable_income": pos.current_taxable_income,
        "current_bracket_rate": pos.current_bracket_rate,
        "remaining_in_bracket": pos.remaining_in_bracket,
        "next_bracket_rate": pos.next_bracket_rate,
        "ltcg_rate": pos.ltcg_rate,
        "ltcg_remaining_in_bracket": pos.ltcg_remaining_in_bracket,
        "next_ltcg_rate": pos.next_ltcg_rate,
    }


@router.get("/tax/model-sale")
async def model_sale(
    asset: str = Query(...),
    quantity: float = Query(...),
    sale_price: float = Query(...),
    method: str = Query("FIFO"),
    marginal_rate: float = Query(0.24),
    account_id: Optional[int] = None,
):
    """Model a prospective sale with different lot selection methods."""
    result = tax_engine.model_sale(
        asset=asset,
        quantity=quantity,
        sale_price=sale_price,
        method=method,
        marginal_rate=marginal_rate,
        account_id=account_id,
    )
    return {
        "method": result.method,
        "lots_used": result.lots_used,
        "total_proceeds": result.total_proceeds,
        "total_cost_basis": result.total_cost_basis,
        "total_gain_loss": result.total_gain_loss,
        "short_term_gain": result.short_term_gain,
        "long_term_gain": result.long_term_gain,
        "estimated_tax": result.estimated_tax,
    }


@router.get("/tax/compare-methods")
async def compare_sale_methods(
    asset: str = Query(...),
    quantity: float = Query(...),
    sale_price: float = Query(...),
    marginal_rate: float = Query(0.24),
    account_id: Optional[int] = None,
):
    """Compare FIFO vs HIFO vs LIFO for a prospective sale."""
    methods = ["FIFO", "HIFO", "LIFO"]
    results = {}
    for method in methods:
        result = tax_engine.model_sale(
            asset=asset,
            quantity=quantity,
            sale_price=sale_price,
            method=method,
            marginal_rate=marginal_rate,
            account_id=account_id,
        )
        results[method] = {
            "total_gain_loss": result.total_gain_loss,
            "short_term_gain": result.short_term_gain,
            "long_term_gain": result.long_term_gain,
            "estimated_tax": result.estimated_tax,
            "lots_used_count": len(result.lots_used),
        }
    return results


@router.get("/tax/ytd-realized")
def ytd_realized(tax_year: Optional[int] = None):
    """Get YTD realized gains/losses."""
    return tax_engine.compute_ytd_realized(tax_year)


@router.get("/tax/quarterly-estimates")
def quarterly_estimates(
    w2_income: float = Query(...),
    ytd_realized_gains: float = Query(0),
    prior_year_tax: float = Query(0),
):
    """Estimate quarterly tax payments."""
    estimates = tax_engine.estimate_quarterly_payments(
        w2_income=w2_income,
        ytd_realized_gains=ytd_realized_gains,
        prior_year_tax=prior_year_tax,
    )
    return [
        {
            "quarter": e.quarter,
            "due_date": e.due_date,
            "amount": e.amount,
            "ytd_liability": e.ytd_liability,
        }
        for e in estimates
    ]


@router.get("/tax/form-8949", response_class=PlainTextResponse)
def form_8949_export(tax_year: Optional[int] = None):
    """Export Form 8949 compatible CSV."""
    csv_content = tax_engine.generate_form_8949_csv(tax_year)
    return PlainTextResponse(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=form_8949_{tax_year or 'current'}.csv"},
    )


@router.post("/tax/lots")
def create_lot(
    account_id: int = Query(...),
    asset: str = Query(...),
    quantity: float = Query(...),
    cost_basis_per_unit: float = Query(...),
    acquisition_date: str = Query(...),
    acquisition_method: str = Query("buy"),
):
    """Manually create a tax lot."""
    with get_db() as conn:
        cursor = conn.execute(
            """INSERT INTO lots (account_id, asset, quantity, cost_basis_per_unit,
               acquisition_date, acquisition_method)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (account_id, asset, quantity, cost_basis_per_unit,
             acquisition_date, acquisition_method),
        )
        lot_id = cursor.lastrowid

    return {"id": lot_id, "status": "created"}


async def _get_current_prices() -> dict[str, float]:
    """Fetch current prices for known assets."""
    prices: dict[str, float] = {}
    try:
        btc = await btc_service.get_btc_price()
        prices["BTC"] = btc.usd
    except Exception:
        pass
    return prices
