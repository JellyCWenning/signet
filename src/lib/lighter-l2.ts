import { spawn } from "node:child_process";
import path from "node:path";

const SCRIPT = path.join(process.cwd(), "scripts/lighter-l2.py");

export interface LighterSignTransferInput {
  to_account_index: number;
  asset_id?: number;
  route_from?: number;
  route_to?: number;
  amount: number;
  fee: number;
  memo: string;
}

export interface LighterSignedTransfer {
  ok: true;
  tx_type: number;
  tx_info: Record<string, unknown>;
  tx_hash?: string;
  message_to_sign: string;
  nonce: number;
  api_key_index: number;
}

function runPython(command: string, payload?: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const child = spawn("python3", [SCRIPT, command], {
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      const out = Buffer.concat(stdout).toString("utf8");
      const err = Buffer.concat(stderr).toString("utf8");
      if (code !== 0) {
        reject(new Error(`lighter-l2.py ${command} exited ${code}: ${err || out}`));
        return;
      }
      try {
        resolve(JSON.parse(out));
      } catch {
        reject(new Error(`lighter-l2.py ${command} returned non-JSON: ${out || err}`));
      }
    });
    if (payload != null) child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

export async function checkLighterApiKey(): Promise<{
  ok: boolean;
  check: string | null;
  account_index: number;
  api_key_index: number;
  nonce: number;
}> {
  return runPython("check") as Promise<{
    ok: boolean;
    check: string | null;
    account_index: number;
    api_key_index: number;
    nonce: number;
  }>;
}

export async function signLighterRelayTransfer(
  input: LighterSignTransferInput,
): Promise<LighterSignedTransfer> {
  const result = (await runPython("sign", input)) as LighterSignedTransfer;
  if (!result?.ok || !result.message_to_sign || result.tx_info == null) {
    throw new Error("Lighter sign-transfer did not return tx_info + message_to_sign");
  }
  return result;
}

export async function sendLighterTx(input: {
  tx_type: number;
  tx_info: Record<string, unknown>;
  l1_sig: string;
}): Promise<unknown> {
  return runPython("send", input);
}
