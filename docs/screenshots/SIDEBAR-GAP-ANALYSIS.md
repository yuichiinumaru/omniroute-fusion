# Sidebar Gap Analysis: 21000 (Old) vs 22000 (Current)

> **Date**: 2026-07-12
> **Source**: `docs/screenshots/screencapture-localhost-21000-*` (old prod) vs `screencapture-localhost-22000-*` (current test)
> **Related**: `.agents/user/chatgpt/ccdesign.md` (L458-604), `docs/guides/UI.md`, Epic 0005

---

## 1. Old Sidebar Inventory (21000 — from Sidebar Customization screenshot)

The old sidebar had **~80+ items** organized into 13 sections. Here is the complete list extracted from the 21000 screenshot:

### COMPATIBILITY
| # | Item | Route |
|---|------|-------|
| 1 | Endpoints | `/dashboard/endpoint` |
| 2 | API Keys | `/dashboard/api-manager` |
| 3 | Providers | `/dashboard/providers` |
| 4 | Embedded Services | `/dashboard/providers/services` |
| 5 | Combos | `/dashboard/combos` |
| 6 | Combo Studio | `/dashboard/combos/live` |
| 7 | Fusions | `/dashboard/fusions` |
| 8 | Provider Quota | `/dashboard/quota` |
| 9 | Quota Sharing | `/dashboard/costs/quota-share` |

### COMPRESSION CONTEXT
| # | Item | Route |
|---|------|-------|
| 10 | Compression Settings | `/dashboard/context/settings` |
| 11 | Engine Combos | `/dashboard/context/combos` |
| 12 | Caveman | `/dashboard/context/caveman` |
| 13 | RTK | `/dashboard/context/rtk` |
| 14 | Headroom | `/dashboard/context/headroom` |
| 15 | Session Dedup | `/dashboard/context/session-dedup` |
| 16 | CCR | `/dashboard/context/ccr` |
| 17 | LLMLingua | `/dashboard/context/llmlingua` |
| 18 | Lite | `/dashboard/context/lite` |
| 19 | Aggressive | `/dashboard/context/aggressive` |
| 20 | Ultra | `/dashboard/context/ultra` |
| 21 | Compression Studio | `/dashboard/compression/studio` |

### TOOLS
| # | Item | Route |
|---|------|-------|
| 22 | CLI Code | `/dashboard/cli-code` |
| 23 | CLI Agents | `/dashboard/cli-agents` |
| 24 | ACP Agents | `/dashboard/acp-agents` |
| 25 | Cloud Agents | `/dashboard/cloud-agents` |
| 26 | Agent Bridge | `/dashboard/tools/agent-bridge` |
| 27 | Traffic Inspector | `/dashboard/tools/traffic-inspector` |

### KEY FEATURES
| # | Item | Route |
|---|------|-------|
| 28 | API Endpoints | `/dashboard/api-endpoints` |
| 29 | Webhooks | `/dashboard/webhooks` |
| 30 | Proxy | `/dashboard/system/proxy` |

### ANALYTICS FEATURES
| # | Item | Route |
|---|------|-------|
| 31 | Usage | `/dashboard/usage` |
| 32 | Combo Health | `/dashboard/analytics/combo-health` |
| 33 | Utilization | `/dashboard/analytics/utilization` |
| 34 | Cache | `/dashboard/cache` |
| 35 | Compression | `/dashboard/analytics/compression` |
| 36 | Search | `/dashboard/analytics/search` |
| 37 | Evals | `/dashboard/analytics/evals` |
| 38 | Provider Stats | `/dashboard/provider-stats` |

### COSTS
| # | Item | Route |
|---|------|-------|
| 39 | Overview | `/dashboard/costs` |
| 40 | Pricing | `/dashboard/costs/pricing` |
| 41 | Budget | `/dashboard/costs/budget` |
| 42 | Free-Tier Budget | `/dashboard/free-tiers` |
| 43 | Free Provider Rankings | `/dashboard/free-provider-rankings` |

### MONITORING
| # | Item | Route |
|---|------|-------|
| 44 | Activity | `/dashboard/activity` |
| 45 | Logs | `/dashboard/logs` |
| 46 | Proxy Logs | `/dashboard/logs/proxy` |
| 47 | Console Logs | `/dashboard/logs/console` |
| 48 | Audit Log | `/dashboard/audit` |
| 49 | MCP Audit | `/dashboard/audit/mcp` |
| 50 | A2A Audit | `/dashboard/audit/a2a` |
| 51 | Health | `/dashboard/health` |
| 52 | Runtime | `/dashboard/runtime` |

### DEV TOOLS
| # | Item | Route |
|---|------|-------|
| 53 | Translator | `/dashboard/translator` |
| 54 | Playground | `/dashboard/playground` |
| 55 | Search Tools | `/dashboard/search-tools` |

### AGENTIC FEATURES
| # | Item | Route |
|---|------|-------|
| 56 | Memory | `/dashboard/memory` |
| 57 | AgentSkills | `/dashboard/agent-skills` |
| 58 | OmniSkills | `/dashboard/omni-skills` |
| 59 | MCP Server | `/dashboard/mcp` |
| 60 | A2A Server | `/dashboard/a2a` |
| 61 | Plugins | `/dashboard/plugins` |

### OTHER FEATURES (Gamification)
| # | Item | Route |
|---|------|-------|
| 62 | Leaderboard | `/dashboard/leaderboard` |
| 63 | Profile | `/dashboard/profile` |
| 64 | Tokens | `/dashboard/tokens` |

### BATCH
| # | Item | Route |
|---|------|-------|
| 65 | Batch Jobs | `/dashboard/batch` |
| 66 | Files | `/dashboard/batch/files` |

### CONFIGURATION
| # | Item | Route |
|---|------|-------|
| 67 | Storage | `/dashboard/settings/general` |
| 68 | Appearance | `/dashboard/settings/appearance` |
| 69 | AI Settings | `/dashboard/settings/ai` |
| 70 | Global Routing | `/dashboard/settings/routing` |
| 71 | Resilience | `/dashboard/settings/resilience` |
| 72 | Advanced | `/dashboard/settings/advanced` |
| 73 | Security | `/dashboard/settings/security` |
| 74 | Access Tokens | `/dashboard/settings/access-tokens` |
| 75 | Feature Flags | `/dashboard/settings/feature-flags` |
| 76 | Sidebar | `/dashboard/settings/sidebar` |

### HELP
| # | Item | Route |
|---|------|-------|
| 77 | Docs | `/docs` (external) |
| 78 | Issues | GitHub issues (external) |
| 79 | Changelog | `/dashboard/changelog` |

**Total: ~79 sidebar items in the old version.**

---

## 2. Current Sidebar Inventory (22000 — from screenshots)

The new sidebar has **10 primary leaves** (flat, no accordion):

| # | Label | ID | Route | Subtitle |
|---|-------|----|-------|----------|
| 1 | Home | `home` | `/home` | Welcome to OmniRoute |
| 2 | Providers | `providers` | `/dashboard/providers` | Models · services · exposures |
| 3 | Routing | `combos` | `/dashboard/combos` | Combos · fusions · compression |
| 4 | API Keys | `api-manager` | `/dashboard/api-manager` | Access · tokens · security |
| 5 | Observe | `activity` | `/dashboard/activity` | Logs · audit · stream |
| 6 | Analytics | `analytics` | `/dashboard/analytics` | Charts · evals · health |
| 7 | Costs | `costs` | `/dashboard/costs` | Budget · pricing · quota |
| 8 | Operations | `cli-code` | `/dashboard/cli-code` | CLI · agents · inspector |
| 9 | Settings | `settings-general` | `/dashboard/settings/general` | System · appearance · network |
| 10 | Docs | `docs` | `/docs` | Guides · changelog |

**Dev Tools** (debug mode only):
| # | Label | Route |
|---|-------|-------|
| 11 | Translator | `/dashboard/translator` |
| 12 | Playground | `/dashboard/playground` |
| 13 | Search Tools | `/dashboard/search-tools` |

---

## 3. Gap Analysis — What's Missing

### 3.1 CRITICAL: Settings sub-pages not accessible

**The biggest gap.** The old sidebar had 10 separate Settings items (Storage, Appearance, AI Settings, Global Routing, Resilience, Advanced, Security, Access Tokens, Feature Flags, Sidebar). The new sidebar has **only one**: `Settings → General`.

**Routes that EXIST but have NO sidebar/nav access:**

| Settings Page | Route | Accessible? |
|---------------|-------|-------------|
| General (Storage) | `/dashboard/settings/general` | ✅ Sidebar links here |
| Appearance | `/dashboard/settings/appearance` | ❌ No nav |
| AI Settings | `/dashboard/settings/ai` | ❌ No nav |
| Global Routing | `/dashboard/settings/routing` | ❌ No nav |
| Resilience | `/dashboard/settings/resilience` | ❌ No nav |
| Advanced | `/dashboard/settings/advanced` | ❌ No nav |
| Security | `/dashboard/settings/security` | ❌ No nav |
| Access Tokens | `/dashboard/settings/access-tokens` | ❌ No nav |
| Feature Flags | `/dashboard/settings/feature-flags` | ❌ No nav |
| Sidebar Customization | `/dashboard/settings/sidebar` | ❌ No nav |
| Pricing | `/dashboard/settings/pricing` | ❌ No nav |

**Impact**: Users cannot reach 10 out of 11 settings pages from the UI. The screenshot of the 22000 Settings page confirms this — it shows only "Data & Storage" with no tabs, no sub-nav, no way to navigate to other settings.

**Fix needed**: Add a `PageTabBar` or secondary nav inside the Settings page that exposes all settings sub-pages. The ccdesign.md (L473-474) proposes: "onde houver settings/alguém, é pra tirar esse 'alguém' de dentro de settings (no menu superior) e colocar no menu novo" — meaning settings items should be accessible via a top bar within the settings page.

### 3.2 Dev Tools hidden behind debug mode

Translator, Playground, and Search Tools are only visible when `debugMode` is enabled. The ccdesign.md (L567-581) proposes these should be accessible under a "Tools" section, not hidden.

**User impact**: Normal users cannot access these tools at all.

### 3.3 Routes that exist but have NO sidebar access (non-settings)

| Feature | Route | Old Sidebar? | Current Access |
|---------|-------|-------------|----------------|
| Health | `/dashboard/health` | ✅ Monitoring | ❌ Hidden |
| Runtime | `/dashboard/runtime` | ✅ Monitoring | ❌ Hidden |
| Cache | `/dashboard/cache` | ✅ Analytics | ❌ Hidden (but in Analytics subtitle) |
| Provider Stats | `/dashboard/provider-stats` | ✅ Analytics | ❌ Hidden |
| Usage | `/dashboard/usage` | ✅ Analytics | ❌ Hidden |
| Logs | `/dashboard/logs` | ✅ Monitoring | ❌ Hidden (Activity replaces) |
| Proxy Logs | `/dashboard/logs/proxy` | ✅ Monitoring | ❌ Hidden |
| Console Logs | `/dashboard/logs/console` | ✅ Monitoring | ❌ Hidden |
| Audit Log | `/dashboard/audit` | ✅ Monitoring | ❌ Hidden |
| MCP Audit | `/dashboard/audit/mcp` | ✅ Monitoring | ❌ Hidden |
| A2A Audit | `/dashboard/audit/a2a` | ✅ Monitoring | ❌ Hidden |
| Combo Health | `/dashboard/analytics/combo-health` | ✅ Analytics | ❌ Hidden |
| Utilization | `/dashboard/analytics/utilization` | ✅ Analytics | ❌ Hidden |
| Compression Analytics | `/dashboard/analytics/compression` | ✅ Analytics | ❌ Hidden |
| Search Analytics | `/dashboard/analytics/search` | ✅ Analytics | ❌ Hidden |
| Evals | `/dashboard/analytics/evals` | ✅ Analytics | ❌ Hidden |
| Quota | `/dashboard/quota` | ✅ Compatibility | ❌ Hidden |
| Quota Sharing | `/dashboard/costs/quota-share` | ✅ Compatibility | ❌ Hidden |
| Free-Tier Budget | `/dashboard/free-tiers` | ✅ Costs | ❌ Hidden |
| Free Provider Rankings | `/dashboard/free-provider-rankings` | ✅ Costs | ❌ Hidden |
| Embedded Services | `/dashboard/providers/services` | ✅ Compatibility | ❌ Hidden |
| MCP Server | `/dashboard/mcp` | ✅ Agentic | ❌ Hidden |
| A2A Server | `/dashboard/a2a` | ✅ Agentic | ❌ Hidden |
| Webhooks | `/dashboard/webhooks` | ✅ Key Features | ❌ Hidden |
| API Endpoints | `/dashboard/api-endpoints` | ✅ Key Features | ❌ Hidden |
| Plugins | `/dashboard/plugins` | ✅ Agentic | ❌ Hidden |
| Memory | `/dashboard/memory` | ✅ Agentic | ❌ Hidden |
| AgentSkills | `/dashboard/agent-skills` | ✅ Agentic | ❌ Hidden |
| OmniSkills | `/dashboard/omni-skills` | ✅ Agentic | ❌ Hidden |
| Batch | `/dashboard/batch` | ✅ Batch | ❌ Hidden |
| Files | `/dashboard/batch/files` | ✅ Batch | ❌ Hidden |
| Leaderboard | `/dashboard/leaderboard` | ✅ Gamification | ❌ Hidden |
| Profile | `/dashboard/profile` | ✅ Gamification | ❌ Hidden |
| Tokens | `/dashboard/tokens` | ✅ Gamification | ❌ Hidden |
| Media | `/dashboard/cache/media` | ✅ (was separate) | ❌ Hidden |
| Proxy | `/dashboard/system/proxy` | ✅ Key Features | ❌ Hidden |
| Compression Settings | `/dashboard/context/settings` | ✅ Compression | ❌ Hidden |
| Compression Studio | `/dashboard/compression/studio` | ✅ Compression | ❌ Hidden |
| All compression engines | `/dashboard/context/{engine}` | ✅ Compression | ❌ Hidden |

**Total: ~37 routes exist but are NOT accessible from the default sidebar.**

Note: Many of these are intentionally hidden per Epic 0005 (compression engines as tabs, logs as unified stream, etc.). But some critical ones (Settings sub-pages, Dev Tools) are **unintentionally inaccessible**.

### 3.4 Naming mismatches (ID vs Label vs Route)

| Sidebar ID | Label shown | Route | Mismatch |
|------------|-------------|-------|----------|
| `combos` | "Routing" | `/dashboard/combos` | ID says "combos", label says "Routing" |
| `api-manager` | "API Keys" | `/dashboard/api-manager` | ID says "api-manager", label says "API Keys" |
| `activity` | "Observe" | `/dashboard/activity` | ID says "activity", label says "Observe" |
| `settings-general` | "Settings" | `/dashboard/settings/general` | ID says "settings-general", label says "Settings" |
| `cli-code` | "Operations" | `/dashboard/cli-code` | ID says "cli-code", label says "Operations" |

The `labelFallback` values in `PRIMARY_SIDEBAR_ITEMS` are user-facing names that differ from the `id` and `href`. This is by design (Epic 0005), but can cause confusion when discussing features — "where is Routing?" vs "where are Combos?".

### 3.5 ccdesign.md Problems vs Current State

The ccdesign.md (L458-463) lists 3 core problems:

| Problem (ccdesign.md) | Current Status |
|------------------------|----------------|
| "caralhada de menu e submenu, subdivisão caótica" | **Partially fixed** — sidebar went from ~79 to 10 items. But settings sub-pages are lost. |
| "tudo exibido a toda hora (não mt uso de menu colapsável)" | **Fixed** — flat primary nav, hidden items behind presets/debug. |
| "nomenclaturas confusas, alguns nomes com overlaps" | **Partially fixed** — labelFallback added, but ID≠label mismatches remain. |

---

## 4. Recommended Fixes (Priority Order)

### P0 — Settings Navigation (Critical)
The Settings page needs a **tab bar or secondary nav** to expose all 11 settings sub-pages. Without this, users cannot configure Appearance, AI, Routing, Security, etc.

**Options:**
1. Add `PageTabBar` inside `/dashboard/settings/general/page.tsx` with tabs for each settings section
2. Or: restore separate sidebar items under Settings (less ideal per Epic 0005 anti-patterns)

### P1 — Dev Tools Access
Translator, Playground, Search Tools should be accessible without debug mode. Options:
1. Move to a "Tools" section in the sidebar (ccdesign.md L567-581)
2. Or: add them under Operations as tabs

### P2 — Settings Sub-page Redirects
For any user who bookmarked old settings URLs (e.g. `/dashboard/settings/appearance`), ensure they still work and aren't 404.

### P3 — Naming Alignment
Consider aligning sidebar IDs with user-facing labels to reduce confusion:
- `combos` → `routing` (or keep ID, just document the mapping)
- `api-manager` → `api-keys`
- `activity` → `observe`
- `cli-code` → `operations`

---

## 5. Screenshots Reference

| File | What it shows |
|------|---------------|
| `screencapture-localhost-21000-dashboard-settings-sidebar-2026-07-11-16_56_47.png` | Old sidebar customization — ALL 79 items listed with toggles |
| `screencapture-localhost-22000-home-2026-07-11-17_01_25.png` | New sidebar — 10 primary items, Home page |
| `screencapture-localhost-22000-dashboard-providers-2026-07-11-17_01_32.png` | Providers page with sidebar |
| `screencapture-localhost-22000-dashboard-combos-2026-07-11-17_02_00.png` | Routing/Combos page |
| `screencapture-localhost-22000-dashboard-api-manager-2026-07-11-17_02_13.png` | API Keys page |
| `screencapture-localhost-22000-dashboard-activity-2026-07-11-17_02_20.png` | Activity/Observe page |
| `screencapture-localhost-22000-dashboard-analytics-2026-07-11-17_02_41.png` | Analytics page — NO tabs for sub-sections |
| `screencapture-localhost-22000-dashboard-costs-2026-07-11-17_02_56.png` | Costs page |
| `screencapture-localhost-22000-dashboard-settings-general-2026-07-11-17_04_47.png` | Settings → General ONLY — NO tabs for other settings |
| `screencapture-localhost-22000-dashboard-cli-code-2026-07-11-17_04_34.png` | Operations/CLI Code page |
