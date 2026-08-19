---
title: "feat(oauth): add Docker-only Grok CLI local auth capture"
type: "feat"
issue: ""
pr: ""
author: "Builders"
timestamp: "20260813-141500"
agent: "gt-ts-engineer"
project: "omniroute-2"
task: "0161"
description: "Implementation of the 0161 task covering the Docker-only execution of grok-cli to fetch auth.json dynamics."
summary: "Added Docker-only Grok CLI local auth capture."
verification: "Automated via test suite and verification logic."
is_rebuild_safe: true
---

Added an explicit, Docker-only "Add Grok CLI account" flow that automates capturing the local `grok` CLI auth store without exposing secrets to the frontend.
- Subprocesses use bounded array isolation, AbortSignal timeout/cleanup, and lock-based concurrency resistance.
- Mount paths are validated, ensuring the capture reads only from the configured host `.grok` volume.
- The pre-login snapshot never leaves the server boundary; API and UI state use opaque single-use session identifiers and SHA-256 digests.
- Auth validation enforces strict boundaries on issuers, JSON shape, and file sizes, converting locally parsed keys directly to encrypted provider connections and returning safe identity.
