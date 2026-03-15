# Sentinel — Information Security Policy

**Document Owner:** Jason Massie
**Last Updated:** 2026-03-15
**Version:** 1.0
**Classification:** Public

---

## 1. Purpose

This policy defines the information security practices for Sentinel, a self-hosted personal financial intelligence application. Sentinel integrates with financial data providers (including Plaid) to aggregate and analyze personal financial data. Because Sentinel handles sensitive consumer financial information, this policy establishes controls to protect that data throughout its lifecycle.

## 2. Scope

This policy applies to:
- The Sentinel application (backend, frontend, database)
- All infrastructure on which Sentinel is deployed
- All third-party API integrations (Plaid, Coinbase, CoinGecko, Mempool.space)
- The developer and any contributors with access to production systems

## 3. Roles and Responsibilities

| Role | Responsibility | Contact |
|------|---------------|---------|
| Owner / Security Lead | Overall security posture, incident response, policy maintenance | Jason Massie (jmass0729@gmail.com) |

## 4. Data Classification

| Classification | Description | Examples |
|---------------|-------------|----------|
| **Confidential** | Financial credentials, API keys, access tokens | Plaid access tokens, Coinbase API secrets, Gmail OAuth tokens |
| **Sensitive** | Consumer financial data received from APIs | Account balances, transactions, holdings, account numbers |
| **Internal** | Application configuration, logs | Database files, application logs, Docker configs |
| **Public** | Source code, documentation | GitHub repository, README, this policy |

## 5. Access Control

### 5.1 Application Access
- Sentinel is a **single-user, locally-hosted** application — it runs on the owner's machine and is not exposed to the public internet
- No multi-user authentication system exists because the application is not network-accessible beyond localhost
- Access to the application is equivalent to access to the host machine

### 5.2 Infrastructure Access
- Production deployment runs on private infrastructure behind a firewall
- SSH access to production hosts requires key-based authentication
- Multi-factor authentication (MFA) is enforced on all cloud provider accounts and administrative consoles
- MFA is enforced on all critical accounts: GitHub, Plaid Dashboard, Coinbase, Google Cloud (Gmail API)

### 5.3 API Credential Management
- All API keys and secrets are stored as environment variables, never committed to source code
- `.env` files are included in `.gitignore` and never pushed to version control
- Plaid access tokens are stored in the local SQLite database, accessible only to the application process and the host machine owner
- The repository includes a `.env.example` with placeholder values only

### 5.4 Principle of Least Privilege
- Plaid API keys are scoped to the minimum required permissions
- Coinbase API keys require only `wallet:accounts:read` and `wallet:transactions:read`
- Gmail OAuth scope is limited to `gmail.readonly`
- No write/transfer permissions are requested from any financial provider

## 6. Data Protection

### 6.1 Encryption in Transit
- All communication with the Plaid API uses **TLS 1.2+** (enforced by the Plaid Python SDK and httpx client)
- All communication with Coinbase, CoinGecko, Mempool.space, and Gmail APIs uses **HTTPS/TLS 1.2+**
- The local frontend-to-backend communication occurs over localhost only and is not exposed to external networks

### 6.2 Encryption at Rest
- The SQLite database containing financial data resides on the host machine's filesystem
- Host-level disk encryption (BitLocker on Windows, FileVault on macOS, LUKS on Linux) is enabled on all machines running Sentinel
- Plaid access tokens stored in the database are protected by the host's disk encryption
- No consumer financial data is stored in cloud services, third-party databases, or external storage

### 6.3 Data Retention and Disposal
- Financial data is retained only as long as the user actively uses Sentinel
- Deletion of the SQLite database file permanently removes all stored financial data
- Plaid access tokens can be revoked through the Plaid Dashboard at any time
- No data is replicated to external backup services unless explicitly configured by the user

## 7. Network Security

### 7.1 Architecture
- Sentinel runs as a **local-only** application (Docker containers bound to localhost)
- No inbound ports are exposed to the public internet
- The application listens on `localhost:8001` (backend) and `localhost:5173` (frontend)
- All outbound connections are HTTPS to known API endpoints only:
  - `*.plaid.com`
  - `api.coinbase.com`
  - `api.coingecko.com`
  - `mempool.space`
  - `blockstream.info`
  - `googleapis.com`

### 7.2 Firewall
- Host firewall is configured to deny all inbound connections to Sentinel ports from external networks
- Only loopback (127.0.0.1) traffic reaches the application

## 8. Development Security

### 8.1 Secure Development Practices
- Source code is hosted on GitHub with branch protection on the main branch
- Dependencies are pinned to specific versions in `requirements.txt` and `package.json`
- No consumer financial data is included in source code, tests, or documentation
- Test suites use mock/sandbox data only (Plaid sandbox environment)
- Code reviews are performed before merging changes

### 8.2 Dependency Management
- Python dependencies are installed from PyPI with pinned versions
- Node.js dependencies are installed from npm with a lockfile
- Dependencies are periodically reviewed for known vulnerabilities

### 8.3 Vulnerability Management
- GitHub Dependabot alerts are enabled for automated vulnerability detection in dependencies
- Critical vulnerabilities are patched within 7 days of disclosure
- High vulnerabilities are patched within 30 days
- The application does not accept arbitrary user input from external networks, reducing the attack surface

### 8.4 OWASP Top 10 Mitigations
- **Injection:** Parameterized SQL queries used throughout (no string interpolation in SQL)
- **Broken Authentication:** Single-user local app; no authentication bypass possible without host access
- **Sensitive Data Exposure:** All API communication over TLS; secrets in env vars, not code
- **Security Misconfiguration:** Minimal attack surface (localhost only); Docker containers run with default security
- **CSRF/XSS:** CORS restricted to localhost origins; no user-generated content rendered as HTML

## 9. Incident Response

### 9.1 Incident Response Plan
In the event of a suspected security incident:

1. **Identify:** Detect and classify the incident (data breach, unauthorized access, credential compromise)
2. **Contain:** Immediately revoke compromised API credentials (Plaid access tokens, Coinbase API keys) through their respective dashboards
3. **Eradicate:** Identify the root cause; rotate all credentials; patch the vulnerability
4. **Recover:** Re-establish API connections with new credentials; verify data integrity
5. **Report:** Notify affected parties (Plaid compliance team, Coinbase) within 72 hours of confirmed breach
6. **Review:** Document lessons learned and update this policy

### 9.2 Contact for Security Incidents
- **Primary:** Jason Massie — jmass0729@gmail.com
- Plaid incidents: Report via Plaid Dashboard support channel
- GitHub security advisories: Published on the repository's Security tab

## 10. Privacy

### 10.1 Data Collection
- Sentinel collects only the financial data explicitly requested by the user through Plaid Link
- No data is shared with third parties beyond the API providers themselves
- No analytics, telemetry, or tracking is present in the application
- No advertising or monetization of user data

### 10.2 Consumer Consent
- Users explicitly initiate each bank connection through the Plaid Link consent flow
- Users can disconnect any linked account at any time
- Plaid's own privacy disclosures are presented to users during the Link flow

### 10.3 Data Sharing
- Consumer financial data is **never** transmitted to any party other than the APIs listed in Section 7.1
- The application does not have a backend server accessible to anyone other than the local user
- No data is sold, rented, or shared for marketing purposes

## 11. Business Continuity

- Sentinel is a self-hosted application; availability depends on the user's infrastructure
- No SLA is provided or required (single-user, personal use)
- Data can be backed up by copying the SQLite database file
- The application can be rebuilt from source at any time via `docker compose up --build`

## 12. Compliance

- This policy is reviewed and updated at least annually or when significant changes occur
- The AGPL-3.0 license ensures transparency of all security-relevant code
- All security controls described in this document are implemented in the current version of the application

## 13. Policy Review

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-15 | Jason Massie | Initial policy |

---

*This policy applies to the Sentinel project: https://github.com/jasonmassie01/sentinel*
