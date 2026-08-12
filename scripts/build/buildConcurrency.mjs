import fs from "node:fs";
import os from "node:os";

export const DEFAULT_BUILD_CPUS = 4;
export const BUILD_CPU_FRACTION = 0.8;
export const BUILD_WORKER_MEMORY_MB = 4096;
export const BUILD_RESERVED_MEMORY_MB = 2048;

function positiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function getNofileSoftLimit(fsImpl = fs) {
  try {
    const contents = fsImpl.readFileSync("/proc/self/limits", "utf8");
    const match = contents.match(/Max open files\s+(\d+)\s+(\d+)/);
    return match ? positiveInteger(match[1]) : null;
  } catch {
    return null;
  }
}

export function getBuildSystemCapacity(overrides = {}) {
  const logicalCpus =
    positiveInteger(overrides.logicalCpus) ??
    (typeof os.availableParallelism === "function"
      ? os.availableParallelism()
      : os.cpus().length) ??
    DEFAULT_BUILD_CPUS;
  const totalMemoryMb =
    positiveInteger(overrides.totalMemoryMb) ?? Math.floor(os.totalmem() / 1024 / 1024);
  const nofileSoft = overrides.nofileSoft ?? getNofileSoftLimit();

  return { logicalCpus, totalMemoryMb, nofileSoft };
}

/**
 * Select a static Next.js build worker count from current machine capacity.
 *
 * Next.js reads `experimental.cpus` once at build startup, so this is adaptive
 * per build rather than a live controller. Explicit OMNIROUTE_BUILD_CPUS wins;
 * automatic mode is bounded by 80% of logical CPUs, memory reserved for the
 * V8 heap/OS, and the open-file limit that previously caused EMFILE.
 */
export function resolveBuildCpus(env = process.env, capacity = getBuildSystemCapacity()) {
  const explicit = positiveInteger(env?.OMNIROUTE_BUILD_CPUS);
  if (explicit !== null) return explicit;

  const cpuLimit = Math.max(1, Math.floor(capacity.logicalCpus * BUILD_CPU_FRACTION));
  const heapBudgetMb = positiveInteger(env?.OMNIROUTE_BUILD_MEMORY_MB) ?? 8192;
  const memoryBudgetMb =
    capacity.totalMemoryMb * BUILD_CPU_FRACTION - heapBudgetMb - BUILD_RESERVED_MEMORY_MB;
  const memoryLimit = Math.max(1, Math.floor(memoryBudgetMb / BUILD_WORKER_MEMORY_MB));
  const nofileLimit =
    capacity.nofileSoft === null || capacity.nofileSoft === undefined
      ? cpuLimit
      : Math.max(1, Math.floor(capacity.nofileSoft / 512));

  return Math.max(1, Math.min(cpuLimit, memoryLimit, nofileLimit));
}
