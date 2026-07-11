import { createRequire } from "module";
import type { ChildProcess } from "child_process";
import { randomUUID } from "crypto";

const require = createRequire(import.meta.url);
const childProcess = require("child_process") as typeof import("child_process");

interface SandboxConfig {
  cpuLimit: number;
  memoryLimit: number;
  timeout: number;
  networkEnabled: boolean;
  readOnly: boolean;
}

interface SandboxResult {
  id: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  duration: number;
  killed: boolean;
}

const DEFAULT_CONFIG: SandboxConfig = {
  cpuLimit: 100,
  memoryLimit: 256,
  timeout: 30000,
  networkEnabled: false,
  readOnly: true,
};

/**
 * Minimal env for the docker CLI host process. Never spread full `process.env`
 * (F-06-001) — host secrets (JWT_SECRET, API_KEY_SECRET, STORAGE_ENCRYPTION_KEY,
 * provider tokens) must not be inherited by the client or container.
 */
const DOCKER_CLI_ENV_ALLOWLIST = [
  "PATH",
  "HOME",
  "USER",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "TZ",
  "TMPDIR",
  "TMP",
  "TEMP",
  "DOCKER_HOST",
  "DOCKER_TLS_VERIFY",
  "DOCKER_CERT_PATH",
  "DOCKER_CONFIG",
  "XDG_RUNTIME_DIR",
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "NO_PROXY",
  "http_proxy",
  "https_proxy",
  "no_proxy",
] as const;

/** Safe defaults for the container when no skill overlay is provided. */
const CONTAINER_BASE_ENV: Readonly<Record<string, string>> = {
  HOME: "/workspace",
  LANG: "C.UTF-8",
  PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
};

/**
 * Build host env for `docker` spawn — allowlist only, never full process.env.
 * Exported for unit tests.
 */
export function buildDockerCliEnv(
  hostEnv: NodeJS.ProcessEnv = process.env
): Record<string, string> {
  const env: Record<string, string> = {};
  for (const key of DOCKER_CLI_ENV_ALLOWLIST) {
    const value = hostEnv[key];
    if (typeof value === "string" && value.length > 0) {
      env[key] = value;
    }
  }
  // PATH is required for finding the docker binary.
  if (!env.PATH) {
    env.PATH = "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin";
  }
  return env;
}

/**
 * Merge container base env with the skill-provided overlay. Overlay keys override
 * base; never includes host process.env secrets.
 * Exported for unit tests.
 */
export function buildContainerEnv(
  overlay: Record<string, string> = {}
): Record<string, string> {
  const env: Record<string, string> = { ...CONTAINER_BASE_ENV };
  for (const [key, value] of Object.entries(overlay)) {
    if (typeof key === "string" && key.length > 0 && typeof value === "string") {
      env[key] = value;
    }
  }
  return env;
}

class SandboxRunner {
  private static instance: SandboxRunner;
  private runningContainers: Map<string, ChildProcess> = new Map();
  private config: SandboxConfig;

  private constructor(config: Partial<SandboxConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  static getInstance(config?: Partial<SandboxConfig>): SandboxRunner {
    if (!SandboxRunner.instance) {
      SandboxRunner.instance = new SandboxRunner(config);
    }
    return SandboxRunner.instance;
  }

  setConfig(config: Partial<SandboxConfig>): void {
    this.config = { ...this.config, ...config };
  }

  async run(
    image: string,
    command: string[],
    env: Record<string, string> = {},
    configOverride: Partial<SandboxConfig> = {}
  ): Promise<SandboxResult> {
    const sandboxId = randomUUID();
    const startTime = Date.now();
    const config = { ...this.config, ...configOverride };

    const dockerArgs = [
      "run",
      "--rm",
      "--name",
      `omniroute-sandbox-${sandboxId}`,
      "--cpus",
      `${config.cpuLimit / 1000}`,
      "--memory",
      `${config.memoryLimit}m`,
      "--network",
      config.networkEnabled ? "bridge" : "none",
      "--cap-drop",
      "ALL",
      "--security-opt",
      "no-new-privileges",
      "--pids-limit",
      "100",
      "--tmpfs",
      "/tmp:rw,noexec,nosuid,size=64m",
      "--tmpfs",
      "/workspace:rw,noexec,nosuid,size=64m",
      "--workdir",
      "/workspace",
    ];

    if (config.readOnly) {
      dockerArgs.push("--read-only");
    }

    // Pass only allowlisted/skill-overlay vars into the container via -e.
    // Do not inherit host secrets (F-06-001).
    const containerEnv = buildContainerEnv(env);
    for (const [key, value] of Object.entries(containerEnv)) {
      dockerArgs.push("-e", `${key}=${value}`);
    }

    dockerArgs.push(image, ...command);

    return new Promise((resolve) => {
      const proc = childProcess.spawn("docker", dockerArgs, {
        env: buildDockerCliEnv(process.env),
        stdio: ["ignore", "pipe", "pipe"],
      });

      this.runningContainers.set(sandboxId, proc);

      let stdout = "";
      let stderr = "";

      proc.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      const timeoutId = setTimeout(() => {
        this.kill(sandboxId);
      }, config.timeout);

      proc.on("close", (code) => {
        clearTimeout(timeoutId);
        this.runningContainers.delete(sandboxId);

        resolve({
          id: sandboxId,
          exitCode: code,
          stdout,
          stderr,
          duration: Date.now() - startTime,
          killed: code === null,
        });
      });

      proc.on("error", (err) => {
        clearTimeout(timeoutId);
        this.runningContainers.delete(sandboxId);

        resolve({
          id: sandboxId,
          exitCode: -1,
          stdout,
          stderr: err.message,
          duration: Date.now() - startTime,
          killed: false,
        });
      });
    });
  }

  kill(sandboxId: string): boolean {
    const proc = this.runningContainers.get(sandboxId);
    if (proc) {
      proc.kill("SIGTERM");
      this.runningContainers.delete(sandboxId);
      childProcess.spawn("docker", ["kill", `omniroute-sandbox-${sandboxId}`], {
        stdio: "ignore",
      });
      return true;
    }
    return false;
  }

  killAll(): void {
    for (const [id, proc] of this.runningContainers) {
      proc.kill("SIGTERM");
      childProcess.spawn("docker", ["kill", `omniroute-sandbox-${id}`], { stdio: "ignore" });
    }
    this.runningContainers.clear();
  }

  isRunning(sandboxId: string): boolean {
    return this.runningContainers.has(sandboxId);
  }

  getRunningCount(): number {
    return this.runningContainers.size;
  }
}

export const sandboxRunner = SandboxRunner.getInstance();
export type { SandboxConfig, SandboxResult };
