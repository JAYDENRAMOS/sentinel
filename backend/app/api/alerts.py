from fastapi import APIRouter, Query
from typing import Optional
from app.services import alert_engine, btc_service
from app.database import get_db

router = APIRouter(tags=["alerts"])


@router.get("/alerts")
async def get_alerts():
    """Get all active alerts from all modules."""
    prices: dict[str, float] = {}
    try:
        btc = await btc_service.get_btc_price()
        prices["BTC"] = btc.usd
    except Exception:
        pass

    alerts = alert_engine.get_all_alerts(prices=prices)
    return [
        {
            "id": a.id,
            "type": a.type,
            "severity": a.severity,
            "title": a.title,
            "message": a.message,
            "source_module": a.source_module,
            "amount": a.amount,
        }
        for a in alerts
    ]


@router.get("/alerts/value-unlocked")
def value_unlocked(year: Optional[int] = None):
    """Get value unlocked summary."""
    return alert_engine.get_value_unlocked_summary(year)


@router.post("/alerts/value-unlocked")
def record_value_unlocked(
    category: str = Query(...),
    description: str = Query(...),
    amount_saved: float = Query(...),
    source_module: str = Query(...),
):
    """Record a value-unlocked event."""
    with get_db() as conn:
        conn.execute(
            """INSERT INTO value_unlocked (category, description, amount_saved, source_module)
               VALUES (?, ?, ?, ?)""",
            (category, description, amount_saved, source_module),
        )
    return {"status": "recorded"}
