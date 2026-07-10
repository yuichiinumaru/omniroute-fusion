# Idea: Qwen Web — Aliyun baxia WAF Captcha Solver

> **Status**: Planning (deferred — not worth implementing right now)
> **Priority**: Low
> **Author**: GT-Architect
> **Date**: 2026-07-08
> **Context**: qwen-web executor works (TLS impersonation + cookie), but Aliyun baxia WAF returns slide captcha challenge for every server-to-server request.

---

## Problem

The qwen-web executor (`open-sse/executors/qwen-web.ts`) uses TLS impersonation (`qwenTlsClient.ts`) and sends a valid session cookie, but the Aliyun baxia WAF at `chat.qwen.ai` returns a slide captcha challenge page for every automated request:

```
HTTP 200 OK
Content-Type: text/html
Set-Cookie: acw_tc=...
Body: HTML/JS page with AliyunCaptcha.js slide puzzle challenge
```

This prevents the executor from making successful requests.

## Research Done

- **Cookie is valid**: JWT decodes correctly, expires 2026-08-07
- **TLS impersonation works**: Requests reach qwen.ai servers
- **WAF blocks**: baxia returns captcha challenge before reaching the API
- **Response structure**: HTML page with `requestInfo` JSON in `<textarea id="renderData">`, loads `AliyunCaptcha.js` from `o.alicdn.com`
- **Challenge fields**: `sceneId`, `userId`, `userUserId`, `traceId`, `token`, `region`

## Proposed Solution (not implemented)

### Short-term: Detect and report cleanup
- Add WAF challenge detection to `qwen-web.ts` (regex for `aliyun_waf_aa`, `滑动验证页面`, `access verification`)
- Return structured error instead of "Internal error..."
- ~80 lines, low risk

### Long-term: Captcha solver abstraction
- Create `open-sse/services/captchaSolver.ts` with pluggable interface:
  - `solveChallenge(challenge: WafChallenge): Promise<CaptchaSolution>`
  - Returns `u_atoken` + `u_asig` for resubmission
- Implementations:
  - CapSolver API (paid, ~$1-3/1000 solves)
  - AntiCaptcha API (paid)
  - Manual solver (logs URL for user to solve in browser)
  - OSS solver (e.g., DrissionPage, selenium-stealth — free but complex)
- Flow: detect WAF → extract challenge → call solver → resubmit with token

### Alternative: Playwright
- Use `runner-web` profile Chromium to solve captcha headlessly
- Slow (5-15s), requires browser, but 100% reliable

## Why Deferred

- No urgent need for qwen-web
- Paid captcha solvers not worth it for personal use
- OSS alternatives require investigation
- Gemini-web HTTP refactor already covers the main fusion use case

## References

- Curl test result: `open-sse/executors/qwen-web.ts` 
- Curl shows WAF response structure (see conversation 2026-07-08): HTML with `<meta aliyun_waf_aa>`, `<textarea id="renderData">`, `AliyunCaptcha.js`
- Similar WAFs: Cloudflare Turnstile (gemini-web), baxia (qwen, doubao, yi)