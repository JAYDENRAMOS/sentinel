# Contributing to Sentinel

Thanks for your interest in contributing to Sentinel. This document outlines how to get started.

## Development Setup

1. **Clone the repo:**
   ```bash
   git clone https://github.com/jasonmassie01/sentinel.git
   cd sentinel
   ```

2. **Backend (Python 3.12+):**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   pip install pytest
   uvicorn app.main:app --reload
   ```

3. **Frontend (Node 20+):**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Or use Docker:**
   ```bash
   docker compose up --build
   ```

## Running Tests

```bash
cd backend
pytest tests/ -v
```

```bash
cd frontend
npx tsc --noEmit
```

## Project Structure

- `backend/app/api/` — FastAPI route handlers
- `backend/app/services/` — Business logic (tax engine, BTC service, etc.)
- `backend/app/parsers/` — CSV parsers for different institutions
- `frontend/src/pages/` — React page components (one per module)
- `frontend/src/api/` — TypeScript API client and types

## How to Contribute

### Adding a New CSV Parser

1. Add a parser function in `backend/app/parsers/csv_parser.py`
2. Register it in the `PARSERS` dict in `backend/app/services/import_service.py`
3. Add tests in `backend/tests/test_csv_parser.py`

### Adding Merchant Categories

Add entries to `MERCHANT_CATEGORIES` in `backend/app/parsers/csv_parser.py`:

```python
"MERCHANT_NAME": ("category", "subcategory"),
```

### Updating Tax Brackets

Tax brackets are defined in `backend/app/services/tax_engine.py`:
- `FEDERAL_BRACKETS` — ordinary income brackets
- `LTCG_BRACKETS` — long-term capital gains brackets

Update these annually when new rates are published.

### Adding a New Module/Page

1. Create the backend service in `backend/app/services/`
2. Create the API router in `backend/app/api/`
3. Register the router in `backend/app/main.py`
4. Create the frontend page in `frontend/src/pages/`
5. Add the route in `frontend/src/App.tsx`
6. Add nav link in `frontend/src/components/Layout.tsx`

## Code Style

- **Python:** Follow PEP 8. Type hints encouraged but not required everywhere.
- **TypeScript:** Strict mode enabled. No `any` types unless unavoidable.
- **CSS:** CSS modules/files per component. Use CSS variables from `index.css`.
- **Commits:** Clear, descriptive messages. Reference the module you're changing.

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Include tests for new parsers or service logic
- Ensure `npx tsc --noEmit` passes (frontend)
- Ensure `pytest` passes (backend)
- Update the README if you add new endpoints or features

## Reporting Issues

Open an issue with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- CSV sample (redacted) if it's a parser issue

## Areas Where Help is Wanted

- Additional CSV parsers (Vanguard, E-Trade, Robinhood, etc.)
- More merchant auto-categorization rules
- Receipt parsing templates for more retailers
- State tax support beyond Texas
- Playwright auto-fetch scripts for brokerage CSV downloads
- Price scraping implementations for retailer monitoring
- UI improvements and data visualizations

## License

By contributing, you agree that your contributions will be licensed under the AGPL-3.0 license.
