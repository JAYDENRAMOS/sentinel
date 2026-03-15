"""
Coinbase integration — pull balances, transactions, and holdings
automatically via Coinbase API (API key auth).

Setup: Create an API key at coinbase.com/settings/api with
"wallet:accounts:read" and "wallet:transactions:read" permissions.
"""

import hmac
import hashlib
import time
from dataclasses import dataclass
from typing import Optional

import httpx

from app.config import settings
from app.database import get_db

COINBASE_API = "https://api.coinbase.com/v2"


@dataclass
class CoinbaseAccount:
    id: str
    name: str
    currency: str
    balance: float
    native_balance: float  # USD value


@dataclass
class CoinbaseTransaction:
    id: str
    type: str  # buy, sell, send, receive, trade
    amount: float
    currency: str
    native_amount: float  # USD
    date: str
    description: str


def is_configured() -> bool:
    return bool(settings.coinbase_api_key and settings.coinbase_api_secret)


def _get_headers(method: str, path: str, body: str = "") -> dict:
    """Generate Coinbase API auth headers (API key v2 auth)."""
    timestamp = str(int(time.time()))
    message = timestamp + method.upper() + path + body
    signature = hmac.new(
        settings.coinbase_api_secret.encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()

    return {
        "CB-ACCESS-KEY": settings.coinbase_api_key,
        "CB-ACCESS-SIGN": signature,
        "CB-ACCESS-TIMESTAMP": timestamp,
        "CB-VERSION": "2024-01-01",
        "Content-Type": "application/json",
    }


async def get_accounts() -> list[CoinbaseAccount]:
    """Fetch all Coinbase accounts (wallets)."""
    path = "/v2/accounts?limit=100"
    headers = _get_headers("GET", path)

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(f"{COINBASE_API.replace('/v2', '')}{path}", headers=headers)
        resp.raise_for_status()
        data = resp.json()

    accounts = []
    for acct in data.get("data", []):
        balance = float(acct.get("balance", {}).get("amount", 0))
        native = float(acct.get("native_balance", {}).get("amount", 0))

        if balance == 0 and native == 0:
            continue  # Skip empty wallets

        accounts.append(CoinbaseAccount(
            id=acct["id"],
            name=acct.get("name", acct.get("currency", {}).get("code", "Unknown")),
            currency=acct.get("currency", {}).get("code", "USD"),
            balance=balance,
            native_balance=native,
        ))

    return accounts


async def get_transactions(account_id: str, limit: int = 100) -> list[CoinbaseTransaction]:
    """Fetch transactions for a Coinbase account."""
    path = f"/v2/accounts/{account_id}/transactions?limit={limit}"
    headers = _get_headers("GET", path)

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(f"{COINBASE_API.replace('/v2', '')}{path}", headers=headers)
        resp.raise_for_status()
        data = resp.json()

    txs = []
    for tx in data.get("data", []):
        amount = float(tx.get("amount", {}).get("amount", 0))
        native = float(tx.get("native_amount", {}).get("amount", 0))
        tx_type = tx.get("type", "unknown")
        desc = tx.get("details", {}).get("title", "") or tx.get("description", "")
        date_str = tx.get("created_at", "")[:10]

        txs.append(CoinbaseTransaction(
            id=tx["id"],
            type=tx_type,
            amount=abs(amount),
            currency=tx.get("amount", {}).get("currency", ""),
            native_amount=abs(native),
            date=date_str,
            description=desc,
        ))

    return txs


async def sync_coinbase() -> dict:
    """
    Full sync: pull all Coinbase accounts, balances, and transactions
    into the Sentinel database.
    """
    if not is_configured():
        return {"error": "Coinbase not configured"}

    cb_accounts = await get_accounts()
    accounts_synced = 0
    holdings_synced = 0
    transactions_synced = 0

    with get_db() as conn:
        for cb_acct in cb_accounts:
            # Find or create the local account
            existing = conn.execute(
                "SELECT id FROM accounts WHERE coinbase_account_id = ?",
                (cb_acct.id,),
            ).fetchone()

            if existing:
                account_id = existing["id"]
            else:
                cursor = conn.execute(
                    """INSERT INTO accounts
                       (name, type, institution, coinbase_account_id)
                       VALUES (?, 'crypto', 'coinbase', ?)""",
                    (f"Coinbase {cb_acct.currency}", cb_acct.id),
                )
                account_id = cursor.lastrowid

            # Upsert holding
            conn.execute(
                "DELETE FROM holdings WHERE account_id = ? AND asset = ?",
                (account_id, cb_acct.currency),
            )
            conn.execute(
                """INSERT INTO holdings
                   (account_id, asset, quantity, current_value)
                   VALUES (?, ?, ?, ?)""",
                (account_id, cb_acct.currency, cb_acct.balance, cb_acct.native_balance),
            )
            holdings_synced += 1

            conn.execute(
                "UPDATE accounts SET last_import_date = datetime('now') WHERE id = ?",
                (account_id,),
            )
            accounts_synced += 1

        # Sync transactions for BTC account (primary interest)
        for cb_acct in cb_accounts:
            if cb_acct.currency != "BTC":
                continue

            local_acct = conn.execute(
                "SELECT id FROM accounts WHERE coinbase_account_id = ?",
                (cb_acct.id,),
            ).fetchone()
            if not local_acct:
                continue

            try:
                txs = await get_transactions(cb_acct.id)
            except Exception:
                continue

            for tx in txs:
                # Check if already imported
                existing_tx = conn.execute(
                    "SELECT id FROM transactions WHERE coinbase_tx_id = ?",
                    (tx.id,),
                ).fetchone()
                if existing_tx:
                    continue

                tx_type = _map_coinbase_tx_type(tx.type)
                conn.execute(
                    """INSERT INTO transactions
                       (account_id, date, type, asset, quantity, total_amount,
                        description, tax_relevant, source, coinbase_tx_id)

                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'auto_fetch', ?)""",
                    (local_acct["id"], tx.date, tx_type, tx.currency,
                     tx.amount, tx.native_amount, tx.description,
                     1 if tx_type in ("buy", "sell") else 0,
                     tx.id),
                )
                transactions_synced += 1

    return {
        "accounts_synced": accounts_synced,
        "holdings_synced": holdings_synced,
        "transactions_synced": transactions_synced,
    }


def _map_coinbase_tx_type(cb_type: str) -> str:
    mapping = {
        "buy": "buy",
        "sell": "sell",
        "send": "transfer",
        "receive": "transfer",
        "trade": "buy",
        "fiat_deposit": "income",
        "fiat_withdrawal": "expense",
    }
    return mapping.get(cb_type, "transfer")
