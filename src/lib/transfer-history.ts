import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import type { RouteFundsResult, RouteStep } from "@/lib/fireblocks-route";

const HISTORY_PATH = path.join(process.cwd(), "transfer-history.local.json");
const AUTO_STATE_PATH = path.join(process.cwd(), "auto-margin-state.local.json");
const MAX_RECORDS = 200;

export type TransferOrigin = "manual" | "automatic";
export type TransferHistoryStatus = "running" | "completed" | "failed";

export interface TransferHistoryRecord {
  id: string;
  createdAt: string;
  completedAt?: string;
  origin: TransferOrigin;
  method?: string;
  fromVenueId: string;
  toVenueId: string;
  amount: string;
  status: TransferHistoryStatus;
  railId?: string;
  steps?: RouteStep[];
  error?: string;
}

interface AutoMarginState {
  status?: string;
  route?: string;
  amount?: string;
  lastAttemptAt?: string;
  lastCompletedAt?: string;
  result?: RouteFundsResult;
}

function readHistoryFile(): TransferHistoryRecord[] {
  try {
    if (!existsSync(HISTORY_PATH)) return [];
    const parsed = JSON.parse(readFileSync(HISTORY_PATH, "utf8"));
    return Array.isArray(parsed) ? (parsed as TransferHistoryRecord[]) : [];
  } catch {
    return [];
  }
}

function historicAutoTransfer(): TransferHistoryRecord | null {
  try {
    if (!existsSync(AUTO_STATE_PATH)) return null;
    const state = JSON.parse(readFileSync(AUTO_STATE_PATH, "utf8")) as AutoMarginState;
    if (!state.lastCompletedAt || !state.route || !state.amount || !state.result) return null;
    const hyperliquidToLighter = state.route === "hyperliquidToLighter";
    if (!hyperliquidToLighter && state.route !== "lighterToHyperliquid") return null;
    const createdAt = state.lastAttemptAt ?? state.lastCompletedAt ?? new Date().toISOString();
    return {
      id: `auto-${createdAt}`,
      createdAt,
      completedAt: state.lastCompletedAt ?? createdAt,
      origin: "automatic",
      method: state.route,
      fromVenueId: hyperliquidToLighter ? "hyperliquid_fireblocks" : "lighter_fireblocks",
      toVenueId: hyperliquidToLighter ? "lighter_fireblocks" : "hyperliquid_fireblocks",
      amount: state.amount,
      status: "completed",
      railId: state.result.railId,
      steps: state.result.steps,
    };
  } catch {
    return null;
  }
}

function readHistory(): TransferHistoryRecord[] {
  const records = readHistoryFile();
  if (records.length) return records;
  const prior = historicAutoTransfer();
  if (!prior) return [];
  writeHistory([prior]);
  return [prior];
}

function writeHistory(records: TransferHistoryRecord[]): void {
  const temporary = `${HISTORY_PATH}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(records.slice(0, MAX_RECORDS), null, 2), {
    encoding: "utf8",
    mode: 0o600,
  });
  renameSync(temporary, HISTORY_PATH);
}

export function listTransferHistory(limit = 20): TransferHistoryRecord[] {
  const safeLimit = Math.max(1, Math.min(MAX_RECORDS, Math.floor(limit) || 20));
  return readHistory().slice(0, safeLimit);
}

export function startTransferHistory(input: {
  origin: TransferOrigin;
  method?: string;
  fromVenueId: string;
  toVenueId: string;
  amount: string;
}): TransferHistoryRecord {
  const record: TransferHistoryRecord = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    status: "running",
    ...input,
  };
  writeHistory([record, ...readHistory()]);
  return record;
}

export function finishTransferHistory(
  id: string,
  outcome: { result: RouteFundsResult } | { error: string },
): TransferHistoryRecord | null {
  let updated: TransferHistoryRecord | null = null;
  const records = readHistory().map((record) => {
    if (record.id !== id) return record;
    updated = {
      ...record,
      completedAt: new Date().toISOString(),
      status: "result" in outcome ? "completed" : "failed",
      ...(outcome && "result" in outcome
        ? { railId: outcome.result.railId, steps: outcome.result.steps }
        : { error: outcome.error }),
    };
    return updated;
  });
  writeHistory(records);
  return updated;
}
