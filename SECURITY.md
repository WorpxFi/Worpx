# Security Policy

## Reporting a Vulnerability

The Worpx Protocol team takes security seriously. If you discover a security vulnerability, we appreciate your responsible disclosure.

**Do not open a public GitHub issue for security vulnerabilities.**

### How to Report

Send an email to **security@worpx.dev** with:

1. **Description** of the vulnerability
2. **Steps to reproduce** the issue
3. **Impact assessment** &mdash; what could an attacker achieve?
4. **Affected components** &mdash; SDK, API, settlement layer, skills, etc.
5. **Suggested fix** (if you have one)

### Response Timeline

| Action | Timeframe |
|:-------|:----------|
| Acknowledgment of report | Within 24 hours |
| Initial assessment | Within 48 hours |
| Status update | Within 5 business days |
| Resolution target | Within 30 days (critical), 90 days (non-critical) |

### Severity Classification

| Severity | Description | Examples |
|:---------|:------------|:--------|
| **Critical** | Direct loss of funds or private key exposure | Key extraction, unauthorized transactions, settlement bypass |
| **High** | Significant impact on protocol integrity | Transaction manipulation, skill injection, auth bypass |
| **Medium** | Limited impact, requires specific conditions | Rate limit bypass, information disclosure, privilege escalation |
| **Low** | Minimal impact, theoretical risk | Logging sensitive data, minor API inconsistencies |

## Supported Versions

| Version | Supported |
|:--------|:----------|
| Latest (main) | Yes |
| Previous minor | Security fixes only |
| Older versions | No |

## Security Architecture

### Key Management

- Agent private keys are stored in isolated secure enclaves
- Keys are never transmitted over the network in plaintext
- API keys use scoped permissions with automatic rotation support
- Session tokens have configurable TTL with forced expiration

### Transaction Security

- All transactions require explicit agent authorization
- Multi-signature support for high-value operations
- MEV protection via private transaction submission (Flashbots)
- Transaction simulation before on-chain submission
- Configurable spending limits per agent, per session, per chain

### Network Security

- TLS 1.3 enforced on all API endpoints
- Rate limiting per API key and per IP
- Request signing for sensitive operations
- CORS restrictions on browser-facing endpoints

### Skill Security

- Skills execute in sandboxed environments
- Skills cannot access other agents' keys or funds
- Skill permissions are explicitly granted by the agent owner
- All skill interactions are logged and auditable

## Bug Bounty

We operate a private bug bounty program. Qualifying reports may be eligible for rewards based on severity:

| Severity | Reward Range |
|:---------|:-------------|
| Critical | $5,000 &ndash; $25,000 |
| High | $1,000 &ndash; $5,000 |
| Medium | $250 &ndash; $1,000 |
| Low | Recognition + swag |

### Eligibility

- First reporter of a unique vulnerability
- Report includes clear reproduction steps
- Vulnerability is within the scope of supported components
- Reporter agrees to responsible disclosure timeline

### Out of Scope

- Social engineering attacks
- Denial of service (volumetric)
- Issues in third-party dependencies (report upstream)
- Issues requiring physical access
- Vulnerabilities in unsupported versions

## Security Best Practices for Integrators

1. **Never hardcode private keys** &mdash; use environment variables or secret managers
2. **Rotate API keys** regularly and scope permissions to minimum required
3. **Validate all inputs** from agent prompts before executing transactions
4. **Set spending limits** appropriate to your use case
5. **Monitor transaction logs** for anomalous patterns
6. **Keep dependencies updated** &mdash; run `npm audit` regularly
7. **Use the SDK's built-in validation** rather than constructing raw transactions

## Disclosure Policy

- We will work with you to understand and resolve the issue
- We will provide credit to reporters (unless anonymity is requested)
- We will not pursue legal action against good-faith security researchers
- We request a 90-day disclosure window before public disclosure

---

For general (non-security) bugs, please open a [GitHub issue](https://github.com/WorpxDeveloper/worpx-protocol/issues).

## Agent Security

Agent-to-agent communication uses encrypted messaging channels with per-session nonces. All agent credentials are stored with base64 encoding and support automatic key rotation. Platform connector authentication supports OAuth2, Bearer tokens, API keys, and HMAC signing.
