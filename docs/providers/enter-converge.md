# Links da documentação

https://enter.converge.ai/
https://enter.converge.ai/blog?category=Announcement
https://enter.converge.ai/blog?category=Changelog
https://enter.converge.ai/blog?category=Event
https://enter.converge.ai/blog?category=Guide
https://enter.converge.ai/blog?category=Insight
https://enter.converge.ai/blog?category=User%20Story
https://enter.converge.ai/features/ai-agents-for-hr
https://enter.converge.ai/features/ai-coding-assistant
https://enter.converge.ai/features/ai-for-developers
https://enter.converge.ai/features/ai-for-education
https://enter.converge.ai/features/ai-for-finance
https://enter.converge.ai/features/ai-for-health
https://enter.converge.ai/features/ai-for-marketing
https://enter.converge.ai/features/ai-for-operations
https://enter.converge.ai/features/ai-for-product-manager
https://enter.converge.ai/features/ai-for-productivity
https://enter.converge.ai/features/ai-for-small-businesses
https://enter.converge.ai/features/ai-page-generator
https://enter.converge.ai/features/ai-startup
https://enter.converge.ai/features/online-shop-builder
https://enter.converge.ai/features/saas-website-builder
https://enter.converge.ai/ai-all
https://enter.converge.ai/cli
https://enter.converge.ai/code
https://enter.converge.ai/docs/code
https://enter.converge.ai/docs/code/cli-reference
https://enter.converge.ai/docs/code/configuration
https://enter.converge.ai/docs/code/how-it-works
https://enter.converge.ai/docs/code/image-input
https://enter.converge.ai/docs/code/mcp
https://enter.converge.ai/docs/code/memory
https://enter.converge.ai/docs/code/models
https://enter.converge.ai/docs/code/overview
https://enter.converge.ai/docs/code/permissions
https://enter.converge.ai/docs/code/plan-mode
https://enter.converge.ai/docs/code/quickstart
https://enter.converge.ai/docs/code/rewind
https://enter.converge.ai/docs/code/skills
https://enter.converge.ai/docs/code/sub-agents
https://enter.converge.ai/docs/code/troubleshooting
https://enter.converge.ai/docs/code/worktree
https://enter.converge.ai/features/ai-agent-builder
https://enter.converge.ai/features/ai-app-builder
https://enter.converge.ai/features/ai-website-builder
https://enter.converge.ai/features/collaborative-coding
https://enter.converge.ai/features/visual-editor
https://enter.converge.ai/features/website-template
https://enter.converge.ai/marketplace/components
https://enter.converge.ai/marketplace/design-kit
https://enter.converge.ai/marketplace/templates
https://enter.converge.ai/school
https://enter.converge.ai/school/tutorials/enter-code-CLI-guide
https://enter.converge.ai/school/tutorials/do-the-same-work-for-fewer-credits
https://enter.converge.ai/school/tutorials/enter-code-install-guide


# Catalogo de modelos

Auto
Claude Opus 5 (NEW / BASIC)
Claude Opus 4.8
Claude Sonnet 5
Kimi K3
GPT 5.6 Sol (BASIC)
GPT 5.6 Terra
GPT 5.6 Luna
GPT 5.5
Gemini 3.6 Flash
GLM 5.2
Qwen 3.8 Max Preview (NEW)
Qwen 3.7 Plus
MiniMax M3
DeepSeek V4 Pro
DeepSeek V4 Flash 


# Conteúdo visível em https://www.npmjs.com/package/@enter-pro/enter-code?activeTab=code

#### @enter-pro/enter-code/package.json
/
@enter-pro/enter-code
/
package.json

Back
24 LOC
754 B
{
  "name": "@enter-pro/enter-code",
  "version": "1.0.17",
  "description": "Enter Code - AI-powered coding assistant",
  "bin": {
    "enter": "bin/enter"
  },
  "scripts": {
    "postinstall": "node -e \"console.log('\\nEnter Code installed. Run \\'enter\\' to get started.')\""
  },
  "optionalDependencies": {
    "@enter-pro/enter-code-darwin-arm64": "1.0.17",
    "@enter-pro/enter-code-darwin-x64": "1.0.17",
    "@enter-pro/enter-code-linux-arm64": "1.0.17",
    "@enter-pro/enter-code-linux-x64": "1.0.17",
    "@enter-pro/enter-code-win32-arm64": "1.0.17",
    "@enter-pro/enter-code-win32-x64": "1.0.17"
  },
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://gitlab.knoffice.tech/engineering/enter_agent_sdk"
  }
}

#### @enter-pro/enter-code/bin/enter

#!/usr/bin/env node

"use strict";

const { execFileSync } = require("child_process");
const path = require("path");

const PLATFORM_MAP = {
  "darwin-arm64": "@enter-pro/enter-code-darwin-arm64",
  "darwin-x64": "@enter-pro/enter-code-darwin-x64",
  "linux-arm64": "@enter-pro/enter-code-linux-arm64",
  "linux-x64": "@enter-pro/enter-code-linux-x64",
  "win32-arm64": "@enter-pro/enter-code-win32-arm64",
  "win32-x64": "@enter-pro/enter-code-win32-x64",
};

const platformKey = `${process.platform}-${process.arch}`;
const pkg = PLATFORM_MAP[platformKey];

if (!pkg) {
  console.error(
    `Error: Unsupported platform ${process.platform}-${process.arch}.\n` +
      `Supported platforms: ${Object.keys(PLATFORM_MAP).join(", ")}`
  );
  process.exit(1);
}

let binPath;
try {
  const binName = process.platform === "win32" ? "enter.exe" : "enter";
  binPath = path.join(
    path.dirname(require.resolve(`${pkg}/package.json`)),
    "bin",
    binName
  );
} catch {
  console.error(
    `Error: Could not find package "${pkg}".\n` +
      `Please reinstall @enter-pro/enter-code to fix this issue.`
  );
  process.exit(1);
}

const result = require("child_process").spawnSync(binPath, process.argv.slice(2), {
  stdio: "inherit",
});

if (result.error) {
  console.error(`Error: Failed to run Enter Code: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);

