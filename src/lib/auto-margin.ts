import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { routeNamedVenue, type RouteFundsResult } from "@/lib/fireblocks-route";
import { getVenueSnapshot } from "@/lib/venue-store";

const STATE_PATH = path.join(process.cwd(), "auto-margin-state.local.json");
const DEFAULT_COOLDOWN_MS = 10 * 60_000;

type AutoRoute = "hyperliquidToLighter" | "lighterToHyperliquid";

interface AutoMarginState {
  status: "never" | "idle" | "cooldown" | "running" | "completed" | "blocked" | "failed";
  checkedAt?: string;
  lastAttemptAt?: string;
  lastCompletedAt?: string;
  route?: AutoRoute;
  amount?: string;
  message?: string;
  result?: RouteFundsResult;
}

export interface AutoMarginStatus extends AutoMarginState {
  enabled: boolean;
  cooldownMs: number;
}

function enabled(): boolean {
  return process.env.AUTO_MARGIN_ENABLED?.trim().toLowerCase() === "true";
}

function cooldownMs(): number {
  const parsed = Number(process.env.AUTO_MARGIN_COOLDOWN_MS);
  return Number.isFinite(parsed) && parsed >= 60_000 ? parsed : DEFAULT_COOLDOWN_MS;
}

function readState(): AutoMarginState {
  try {
    if (!existsSync(STATE_PATH)) return { status: "never" };
    return JSON.parse(readFileSync(STATE_PATH, "utf8")) as AutoMarginState;
  } catch {
    return { status: "never", message: "Unable to read prior worker state" };
  }
}

function saveState(state: AutoMarginState): AutoMarginState {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), { encoding: "utf8", mode: 0o600 });
  return state;
}

export function getAutoMarginStatus(): AutoMarginStatus {
  return { ...readState(), enabled: enabled(), cooldownMs: cooldownMs() };
}

export async function runAutoMarginCycle(): Promise<AutoMarginStatus> {
  if (!enabled()) {
    throw new Error("Automatic margin transfers are disabled on this host");
  }

  const checkedAt = new Date().toISOString();
  const [hyperliquid, lighter] = await Promise.all([
    getVenueSnapshot("hyperliquid_fireblocks", { refreshLive: true }),
    getVenueSnapshot("lighter_fireblocks", { refreshLive: true }),
  ]);
  const armed = [hyperliquid, lighter].filter((venue) => venue.enabled && venue.armed);

  if (armed.length === 0) {
    return { ...saveState({ status: "idle", checkedAt, message: "No account is armed" }), enabled: true, cooldownMs: cooldownMs() };
  }
  if (armed.length > 1) {
    return {
      ...saveState({
        status: "blocked",
        checkedAt,
        message: "Both venues are armed; refusing to choose a transfer direction",
      }),
      enabled: true,
      cooldownMs: cooldownMs(),
    };
  }

  const destination = armed[0];
  const route: AutoRoute =
    destination.id === "lighter_fireblocks" ? "hyperliquidToLighter" : "lighterToHyperliquid";
  const amount = String(destination.thresholds.maxTransferUsd);
  const previous = readState();
  const lastAttempt = previous.lastAttemptAt ? Date.parse(previous.lastAttemptAt) : 0;
  const remaining = cooldownMs() - (Date.now() - lastAttempt);
  if (lastAttempt && remaining > 0) {
    return {
      ...saveState({
        ...previous,
        status: "cooldown",
        checkedAt,
        message: `Transfer cooldown active for ${Math.ceil(remaining / 1000)} more seconds`,
      }),
      enabled: true,
      cooldownMs: cooldownMs(),
    };
  }

  const lastAttemptAt = new Date().toISOString();
  saveState({ status: "running", checkedAt, lastAttemptAt, route, amount });
  try {
    const result = await routeNamedVenue(route, {
      amount,
      note: `Auto margin · ${destination.name} at ${destination.live.marginRatioPct.toFixed(2)}%`,
    });
    return {
      ...saveState({
        status: "completed",
        checkedAt,
        lastAttemptAt,
        lastCompletedAt: new Date().toISOString(),
        route,
        amount,
        message: `${destination.name} auto top-up completed`,
        result,
      }),
      enabled: true,
      cooldownMs: cooldownMs(),
    };
  } catch (error) {
    return {
      ...saveState({
        status: "failed",
        checkedAt,
        lastAttemptAt,
        route,
        amount,
        message: error instanceof Error ? error.message : "Automatic margin transfer failed",
      }),
      enabled: true,
      cooldownMs: cooldownMs(),
    };
  }
}
