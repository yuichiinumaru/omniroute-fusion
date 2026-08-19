---
title: "Proxy Security & Trust Model"
version: 3.8.40
lastUpdated: 2026-08-14
---

# Proxy Security & Trust Model

> **Source of truth:** `src/shared/network/isPrivateHost.ts`, `src/shared/validation/schemas/proxy.ts`, `src/lib/proxyRedactionGate.ts`
> **Tests:** `tests/unit/proxy-trust-and-validation.test.ts`, `tests/unit/proxy-redaction-gate.test.ts`, `tests/unit/free-proxies-add-to-pool.test.ts`
> **Last updated:** 2026-08-14 — v3.8.40
> **Audience:** Operators configuring egress proxies and developers extending proxy providers or routing modules.
> **Status:** **MANDATORY** security policy for all egress proxy features.

---

## 1. Core Principles & Non-Goals

OmniRoute provides proxy routing capabilities to manage egress traffic, distribute account rate limits, and bypass regional blocks. However, routing AI inference traffic through proxies introduces critical privacy, integrity, and network security considerations.

### Non-Goal 1: No Shipped or Default-Enabled Free Proxy List
OmniRoute does **NOT** ship with or enable any default public or free proxy list:
- No curated list of open proxies is embedded into source code or database seed migrations.
- No background task automatically discovers or routes user requests through public proxies.
- Proxy routing is completely disabled by default until explicitly configured by an administrator.

### Non-Goal 2: Free-Pool Providers are Staging-Only & Untrusted
OmniRoute includes scrapers for public proxy feeds (`1proxy`, `Proxifly`, `IPLocate`):
- **Staging-Only Isolation**: Free-pool synchronization (`POST /api/settings/free-proxies/sync`) ingests proxies into an isolated staging table (`free_proxies`). Staged proxies are **never** used for request routing.
- **Explicit Promotion with Active Probe**: A staged proxy can only be promoted to the active registry (`proxy_registry`) via an explicit operator action (`POST /api/settings/free-proxies/[id]/add-to-pool` or bulk add). Promotion requires an active connectivity test to succeed.
- **Zero Trust Guarantees**: Public free proxies are untrusted internet relays. They may log traffic, snoop unencrypted payloads, inject responses, or be monitored by hostile third parties. Operators should treat them as ephemeral, best-effort testing tools only.

### Supported Production Path: Bring-Your-Own (BYO) Proxies
The **only** supported and recommended path for production deployments is **Bring-Your-Own (BYO)** proxies:
1. **Dedicated Forward Proxies**: Authenticated HTTP, HTTPS, or SOCKS5 proxies hosted on trusted infrastructure with static or residential egress IPs.
2. **Dedicated Serverless Edge Relays**: Custom edge relays deployed to Vercel Edge (`src/app/api/settings/proxy/vercel-deploy/route.ts`), Deno Deploy (`src/app/api/settings/proxy/deno-deploy/route.ts`), or Cloudflare Workers (`src/app/api/settings/proxy/cloudflare-deploy/route.ts`), authenticated via private `x-relay-auth` tokens.

---

## 2. Server-Side Request Forgery (SSRF) Hardening

To prevent attackers from using proxy configurations or free-pool feeds to probe internal services, private networks, or cloud instance metadata (IMDS), OmniRoute enforces strict SSRF filters on all proxy hosts.

### Prohibited Host Ranges
The validator `isPrivateHost` (`src/shared/network/isPrivateHost.ts`) rejects all of the following addresses:

| Category | Prohibited Range / Pattern | Description |
|---|---|---|
| **IPv4 Loopback** | `127.0.0.0/8`, `0.0.0.0/8` | Localhost loopback interfaces |
| **RFC 1918 Private IPv4** | `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` | Private internal LAN subnets |
| **Link-Local & Cloud IMDS** | `169.254.0.0/16`, `169.254.169.254` | AWS, GCP, Azure, Oracle instance metadata |
| **Carrier-Grade NAT** | `100.64.0.0/10` | CGNAT shared address space |
| **IPv6 Loopback** | `::1`, `::`, `0:0:0:0:0:0:0:1` | Local IPv6 loopback |
| **IPv6 ULA** | `fc00::/7` (`fc00::`–`fdff::`) | Unique Local Addresses |
| **IPv6 Link-Local** | `fe80::/10` (`fe80::`–`febf::`) | Link-local unicast |
| **IPv4-Mapped IPv6** | `::ffff:0:0/96` | IPv4-mapped IPv6 literals |
| **Internal Hostnames** | `localhost`, `*.localhost`, `*.local`, `*.internal`, `metadata.google.internal`, `metadata.goog` | Reserved names and cloud metadata DNS |

### Enforced Layers
SSRF validation is applied across multiple structural layers:
1. **Schema Validation Layer** (`src/shared/validation/schemas/proxy.ts`):
   - `proxyRegistryFieldsSchema`: Applied on single registration and bulk import.
   - `proxyConfigSchema`: Applied on legacy and scoped proxy updates.
   - `testProxySchema`: Applied before triggering ad-hoc connectivity tests.
2. **Ingestion & Staging Layer** (`src/lib/freeProxyProviders/`):
   - `oneproxy.ts`, `proxifly.ts`, and `iplocate.ts` discard any scraped item whose IP satisfies `isPrivateHost`.
3. **Promotion Layer** (`src/lib/db/freeProxies.ts` & `/add-to-pool` routes):
   - Promotion of a staged free proxy to the active pool validates that `host` is not private or loopback before executing the insertion transaction.

---

## 3. Privacy & PII Redaction Gate (Hard Rule #20)

Routing user requests and LLM completions through external proxies sends sensitive prompt context over third-party networks.

### PII Redaction Policy
- **Opt-in by Default**: Per Hard Rule #20, PII redaction (`PII_REDACTION_ENABLED`) and response sanitization (`PII_RESPONSE_SANITIZATION`) default to `false`.
- **Proxy Redaction Gate** (`src/lib/proxyRedactionGate.ts`):
  - Enabling proxy routing (global, provider, combo, or account level) requires PII redaction to be active.
  - If PII redaction is disabled, enabling proxy routing is blocked with `409 Conflict` (`PII_REDACTION_REQUIRED`) unless the operator provides an audited, one-time bypass token.
- **High-Friction Bypass**:
  - To generate a bypass token (`POST /api/settings/proxy/bypass-token`), the operator must explicitly agree and submit the confirmation phrase:
    ```
    "I understand the risks of unredacted proxy routing"
    ```
  - Every bypass token issuance and consumption is recorded to SQLite audit logs (`audit_log` table).

---

## 4. Authorization & Route Locality

All proxy configuration and staging surfaces are protected by the central authorization layer:

1. **Management Authentication**:
   - All routes under `/api/settings/proxies/*`, `/api/settings/free-proxies/*`, and `/api/settings/proxy/*` require management authentication via session cookie, management API key (`manage` or `admin` scope), or local CLI machine token.
2. **Local-Only & Spawn Protection**:
   - System proxy commands and MITM inspection tools (`/api/tools/traffic-inspector/`, `/api/tools/agent-bridge/`) are classified as `LOCAL_ONLY` and rejected if called from non-loopback clients.

---

## 5. Security Checklist for Contributors

When modifying proxy code or adding new proxy providers:
- [ ] Ensure all input schemas reject private and loopback IPs via `isPrivateHost`.
- [ ] Never auto-promote unverified proxies to `proxy_registry`.
- [ ] Never ship hardcoded proxy credentials or endpoints in repository files.
- [ ] Ensure all routes call `requireManagementAuth`.
- [ ] Verify that tests cover SSRF rejection cases and do not regress `proxy-redaction-gate.test.ts`.
