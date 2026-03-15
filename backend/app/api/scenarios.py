from fastapi import APIRouter, Query
from typing import Optional
from app.services import scenario_engine, btc_service

router = APIRouter(tags=["scenarios"])


@router.get("/scenarios/simulate-sale")
async def simulate_sale(
    asset: str = Query(...),
    quantity: float = Query(...),
    sale_price: float = Query(...),
    w2_income: float = Query(0),
    account_id: Optional[int] = None,
):
    """Simulate selling an asset — compare lot methods and show tax impact."""
    return scenario_engine.simulate_sale(
        asset=asset,
        quantity=quantity,
        sale_price=sale_price,
        w2_income=w2_income,
        account_id=account_id,
    )


@router.get("/scenarios/cut-expense")
async def cut_expense(
    monthly_amount: float = Query(...),
    marginal_rate: float = Query(0.24),
    annual_salary: Optional[float] = None,
    portfolio_return: float = Query(0.08),
):
    """Model the impact of cutting a recurring expense."""
    btc_price = None
    try:
        p = await btc_service.get_btc_price()
        btc_price = p.usd
    except Exception:
        pass

    result = scenario_engine.project_expense_cut(
        monthly_amount=monthly_amount,
        marginal_tax_rate=marginal_rate,
        annual_salary=annual_salary,
        portfolio_return_rate=portfolio_return,
        btc_price=btc_price,
    )
    return {
        "monthly_amount": result.monthly_amount,
        "annual_savings": result.annual_savings,
        "pre_tax_cost": result.pre_tax_cost,
        "hours_of_work": result.hours_of_work,
        "invested_1yr": result.invested_1yr,
        "invested_5yr": result.invested_5yr,
        "invested_10yr": result.invested_10yr,
        "btc_equivalent": result.btc_equivalent,
    }


@router.get("/scenarios/tax-year-model")
def tax_year_model(
    w2_income: float = Query(...),
    other_income: float = Query(0),
    short_term_gains: float = Query(0),
    long_term_gains: float = Query(0),
    realized_losses: float = Query(0),
    deductions: float = Query(0),
):
    """Full tax year model with bracket visualization."""
    result = scenario_engine.model_tax_year(
        w2_income=w2_income,
        other_income=other_income,
        short_term_gains=short_term_gains,
        long_term_gains=long_term_gains,
        realized_losses=realized_losses,
        deductions=deductions,
    )
    return {
        "gross_income": result.gross_income,
        "standard_deduction": result.standard_deduction,
        "taxable_income": result.taxable_income,
        "ordinary_tax": result.ordinary_tax,
        "ltcg_tax": result.ltcg_tax,
        "niit": result.niit,
        "total_tax": result.total_tax,
        "effective_rate": round(result.effective_rate, 4),
        "marginal_rate": result.marginal_rate,
        "ltcg_rate": result.ltcg_rate,
        "remaining_in_bracket": result.remaining_in_bracket,
    }


@router.get("/scenarios/dca-analysis")
def dca_analysis(
    asset: Optional[str] = None,
    account_id: Optional[int] = None,
):
    """Analyze DCA performance vs lump sum."""
    return scenario_engine.analyze_dca(account_id=account_id, asset=asset)
