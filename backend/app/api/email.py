from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from app.services import gmail_service, receipt_parser, subscription_detector, price_monitor
from app.database import get_db

router = APIRouter(tags=["email"])


class GmailSetup(BaseModel):
    client_id: str
    client_secret: str


class OAuthCode(BaseModel):
    code: str


class WishlistItem(BaseModel):
    item_description: str
    item_url: Optional[str] = None
    target_price: Optional[float] = None
    priority: int = 3
    notes: Optional[str] = None


# --- Gmail Connection ---

@router.get("/email/status")
def email_status():
    return {
        "configured": gmail_service.is_configured(),
        "authenticated": gmail_service.is_authenticated(),
    }


@router.post("/email/setup")
def setup_gmail(creds: GmailSetup):
    gmail_service.save_credentials(creds.client_id, creds.client_secret)
    auth_url = gmail_service.get_auth_url()
    return {"status": "credentials_saved", "auth_url": auth_url}


@router.get("/email/auth-url")
def get_auth_url():
    url = gmail_service.get_auth_url()
    if not url:
        raise HTTPException(status_code=400, detail="Gmail not configured — POST /api/email/setup first")
    return {"auth_url": url}


@router.post("/email/authenticate")
async def authenticate(data: OAuthCode):
    try:
        result = await gmail_service.exchange_code(data.code)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# --- Receipt Parsing ---

@router.post("/email/scan-receipts")
async def scan_receipts(max_results: int = Query(20)):
    """Scan Gmail for receipt emails and parse them."""
    if not gmail_service.is_authenticated():
        raise HTTPException(status_code=401, detail="Gmail not authenticated")

    messages = await gmail_service.fetch_receipts(max_results)
    parsed = []
    errors = []

    for msg in messages:
        try:
            result = await receipt_parser.parse_email(
                subject=msg.subject,
                body_html=msg.body_html,
                body_text=msg.body_text,
                sender=msg.sender,
            )
            if result:
                # Save to database
                with get_db() as conn:
                    existing = conn.execute(
                        "SELECT id FROM email_receipts WHERE gmail_message_id = ?",
                        (msg.id,),
                    ).fetchone()

                    if not existing:
                        import json
                        items_json = json.dumps([
                            {"name": i.name, "quantity": i.quantity, "price": i.price}
                            for i in result.items
                        ])
                        conn.execute(
                            """INSERT INTO email_receipts
                               (gmail_message_id, merchant, amount, date, items,
                                return_window_days, return_deadline)
                               VALUES (?, ?, ?, ?, ?, ?, ?)""",
                            (msg.id, result.merchant, result.total,
                             result.date or msg.date[:10], items_json,
                             result.return_window_days, result.return_deadline),
                        )

                parsed.append({
                    "message_id": msg.id,
                    "merchant": result.merchant,
                    "total": result.total,
                    "items_count": len(result.items),
                    "return_window_days": result.return_window_days,
                    "return_deadline": result.return_deadline,
                    "confidence": result.confidence,
                })
        except Exception as e:
            errors.append({"message_id": msg.id, "error": str(e)})

    return {
        "scanned": len(messages),
        "parsed": len(parsed),
        "receipts": parsed,
        "errors": errors,
    }


@router.get("/email/receipts")
def list_receipts(limit: int = Query(50)):
    """List stored email receipts."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM email_receipts ORDER BY date DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]


# --- Subscriptions ---

@router.get("/email/subscriptions")
def list_subscriptions():
    """Get all detected subscriptions."""
    return subscription_detector.get_subscriptions()


@router.post("/email/detect-subscriptions")
def detect_subscriptions():
    """Scan expense history to detect recurring subscriptions."""
    subs = subscription_detector.detect_subscriptions()
    subscription_detector.save_detected_subscriptions(subs)
    return {
        "detected": len(subs),
        "subscriptions": [
            {
                "merchant": s.merchant,
                "amount": s.current_amount,
                "frequency": s.frequency,
                "annual_cost": s.annual_cost,
                "price_changed": s.price_changed,
                "price_change": s.price_change_amount,
                "status": s.status,
                "charge_count": s.charge_count,
            }
            for s in subs
        ],
    }


@router.get("/email/subscriptions/total")
def subscription_total():
    """Get total annual subscription cost."""
    total = subscription_detector.get_total_annual_subscription_cost()
    return {"annual_total": total, "monthly_avg": total / 12}


# --- Price Monitoring ---

@router.get("/email/price-watches")
def list_price_watches():
    """Get all active price watches."""
    return price_monitor.get_active_price_watches()


@router.get("/email/price-drop-alerts")
def price_drop_alerts():
    """Get items where price has dropped since purchase."""
    alerts = price_monitor.get_price_drop_alerts()
    return [
        {
            "item": a.item_description,
            "purchase_price": a.purchase_price,
            "purchase_merchant": a.purchase_merchant,
            "current_lowest_price": a.current_lowest_price,
            "lowest_price_source": a.lowest_price_source,
            "savings": a.savings,
            "days_left_to_return": a.days_left_to_return,
            "return_deadline": a.return_deadline,
        }
        for a in alerts
    ]


# --- Wishlist ---

@router.get("/email/wishlist")
def get_wishlist():
    """Get all wishlist items."""
    return price_monitor.get_wishlist()


@router.post("/email/wishlist")
def add_wishlist_item(item: WishlistItem):
    """Add item to wishlist."""
    item_id = price_monitor.add_to_wishlist(
        item_description=item.item_description,
        item_url=item.item_url,
        target_price=item.target_price,
        priority=item.priority,
        notes=item.notes,
    )
    return {"id": item_id, "status": "added"}


@router.delete("/email/wishlist/{item_id}")
def remove_wishlist_item(item_id: int):
    """Remove item from wishlist."""
    price_monitor.remove_from_wishlist(item_id)
    return {"status": "removed"}
