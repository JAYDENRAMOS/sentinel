"""
Price drop monitoring and wishlist tracking.

Monitors prices for:
1. Recent purchases within return window (price drop arbitrage)
2. Wishlist items (deal alerts)

Uses local Playwright scraping — no cloud APIs.
"""

from dataclasses import dataclass
from typing import Optional
from datetime import date, datetime

from app.database import get_db


@dataclass
class PriceCheck:
    item: str
    current_price: Optional[float]
    source: Optional[str]
    checked_at: str


@dataclass
class PriceDropAlert:
    item_description: str
    purchase_price: float
    purchase_merchant: str
    current_lowest_price: float
    lowest_price_source: str
    savings: float
    days_left_to_return: int
    return_deadline: str


def get_active_price_watches() -> list[dict]:
    """Get all items being monitored for price drops."""
    with get_db() as conn:
        rows = conn.execute(
            """SELECT pw.*, er.merchant as original_merchant, er.date as purchase_date
               FROM price_watches pw
               LEFT JOIN email_receipts er ON pw.email_receipt_id = er.id
               WHERE pw.return_window_deadline >= date('now')
               ORDER BY pw.return_window_deadline ASC"""
        ).fetchall()
    return [dict(r) for r in rows]


def get_price_drop_alerts() -> list[PriceDropAlert]:
    """Find items where the price has dropped since purchase."""
    watches = get_active_price_watches()
    alerts = []
    today = date.today()

    for w in watches:
        if not w.get("current_lowest_price") or not w.get("purchase_price"):
            continue
        if w["current_lowest_price"] >= w["purchase_price"]:
            continue

        deadline = date.fromisoformat(w["return_window_deadline"])
        days_left = (deadline - today).days

        if days_left < 0:
            continue

        alerts.append(PriceDropAlert(
            item_description=w["item_description"],
            purchase_price=w["purchase_price"],
            purchase_merchant=w["purchase_merchant"],
            current_lowest_price=w["current_lowest_price"],
            lowest_price_source=w.get("lowest_price_source", "Unknown"),
            savings=w["purchase_price"] - w["current_lowest_price"],
            days_left_to_return=days_left,
            return_deadline=w["return_window_deadline"],
        ))

    alerts.sort(key=lambda a: -a.savings)
    return alerts


def update_price_watch(watch_id: int, price: float, source: str):
    """Update a price watch with new price data."""
    with get_db() as conn:
        current = conn.execute(
            "SELECT current_lowest_price FROM price_watches WHERE id = ?",
            (watch_id,),
        ).fetchone()

        if not current or current["current_lowest_price"] is None or price < current["current_lowest_price"]:
            conn.execute(
                """UPDATE price_watches SET
                   current_lowest_price = ?, lowest_price_source = ?,
                   last_checked = datetime('now'),
                   alert_triggered = CASE WHEN ? < purchase_price THEN 1 ELSE 0 END,
                   savings_potential = purchase_price - ?
                   WHERE id = ?""",
                (price, source, price, price, watch_id),
            )
        else:
            conn.execute(
                "UPDATE price_watches SET last_checked = datetime('now') WHERE id = ?",
                (watch_id,),
            )


# Wishlist management
def get_wishlist() -> list[dict]:
    """Get all wishlist items."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM wishlist ORDER BY priority ASC, added_date DESC"
        ).fetchall()
    return [dict(r) for r in rows]


def add_to_wishlist(
    item_description: str,
    item_url: Optional[str] = None,
    target_price: Optional[float] = None,
    priority: int = 3,
    notes: Optional[str] = None,
) -> int:
    """Add an item to the wishlist."""
    with get_db() as conn:
        cursor = conn.execute(
            """INSERT INTO wishlist
               (item_description, item_url, target_price, priority, notes, source)
               VALUES (?, ?, ?, ?, ?, 'manual')""",
            (item_description, item_url, target_price, priority, notes),
        )
        return cursor.lastrowid


def update_wishlist_price(wishlist_id: int, price: float, source: str):
    """Update current price for a wishlist item."""
    now = datetime.now().isoformat()

    with get_db() as conn:
        item = conn.execute("SELECT * FROM wishlist WHERE id = ?", (wishlist_id,)).fetchone()
        if not item:
            return

        # Update price history
        import json
        history = json.loads(item["price_history"]) if item["price_history"] else []
        history.append({"date": now[:10], "price": price, "source": source})

        # Track lowest ever
        lowest = item["lowest_price_ever"]
        lowest_date = item["lowest_price_date"]
        if lowest is None or price < lowest:
            lowest = price
            lowest_date = now[:10]

        # Check if alert should fire
        alert = False
        if item["target_price"] and price <= item["target_price"]:
            alert = True

        conn.execute(
            """UPDATE wishlist SET
               current_price = ?, current_price_source = ?,
               price_history = ?, lowest_price_ever = ?,
               lowest_price_date = ?, alert_triggered = ?
               WHERE id = ?""",
            (price, source, json.dumps(history), lowest, lowest_date,
             1 if alert else 0, wishlist_id),
        )


def remove_from_wishlist(wishlist_id: int):
    """Remove an item from the wishlist."""
    with get_db() as conn:
        conn.execute("DELETE FROM wishlist WHERE id = ?", (wishlist_id,))
