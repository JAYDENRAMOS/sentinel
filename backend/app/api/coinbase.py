from fastapi import APIRouter, HTTPException
from app.services import coinbase_service

router = APIRouter(tags=["coinbase"])


@router.get("/coinbase/status")
def coinbase_status():
    """Check if Coinbase API is configured."""
    return {"configured": coinbase_service.is_configured()}


@router.get("/coinbase/accounts")
async def coinbase_accounts():
    """Fetch Coinbase accounts (wallets with balances)."""
    if not coinbase_service.is_configured():
        raise HTTPException(status_code=400, detail="Coinbase not configured")
    try:
        accounts = await coinbase_service.get_accounts()
        return [
            {
                "id": a.id,
                "name": a.name,
                "currency": a.currency,
                "balance": a.balance,
                "native_balance": a.native_balance,
            }
            for a in accounts
        ]
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Coinbase API error: {e}")


@router.post("/coinbase/sync")
async def coinbase_sync():
    """Sync all Coinbase accounts, holdings, and transactions."""
    if not coinbase_service.is_configured():
        raise HTTPException(status_code=400, detail="Coinbase not configured")
    try:
        result = await coinbase_service.sync_coinbase()
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {e}")
