import { createHash, createSign, randomUUID } from "crypto";

export interface FireblocksCredentials {
  apiKey: string;
  privateKey: string;
  baseUrl: string;
}

export interface FireblocksRequestOptions {
  method: "GET" | "POST" | "PUT";
  path: string;
  body?: unknown;
  idempotencyKey?: string;
}

function b64url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function signJwt(privateKey: string, claims: Record<string, unknown>): string {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify(claims));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  const signature = signer.sign(privateKey, "base64url");
  return `${header}.${payload}.${signature}`;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "").replace(/\/v1$/, "");
}

function jsonBody(body: unknown): string {
  if (body === undefined) return "";
  return JSON.stringify(body);
}

export function fireblocksErrorMessage(parsed: unknown, fallback: string): string {
  if (typeof parsed === "string" && parsed.trim()) return parsed;
  if (!parsed || typeof parsed !== "object") return fallback;
  const record = parsed as Record<string, unknown>;
  if (typeof record.message === "string" && record.message.trim()) {
    return typeof record.code === "number" || typeof record.code === "string"
      ? `${record.message} (${record.code})`
      : record.message;
  }
  if (typeof record.error === "string" && record.error.trim()) return record.error;
  if (record.error && typeof record.error === "object") {
    const nested = fireblocksErrorMessage(record.error, "");
    if (nested) return nested;
  }
  return fallback;
}

export async function fireblocksRequest<T = unknown>(
  credentials: FireblocksCredentials,
  options: FireblocksRequestOptions,
): Promise<T> {
  const path = options.path.startsWith("/") ? options.path : `/${options.path}`;
  const rawBody = jsonBody(options.body);
  const now = Math.floor(Date.now() / 1000);
  let token: string;
  try {
    token = signJwt(credentials.privateKey, {
      uri: path,
      nonce: randomUUID(),
      iat: now,
      exp: now + 25,
      sub: credentials.apiKey,
      bodyHash: createHash("sha256").update(rawBody, "utf8").digest("hex"),
    });
  } catch {
    throw new Error(
      "RSA private key could not sign a JWT. Paste a PKCS#8 or PKCS#1 PEM that matches this API user.",
    );
  }

  const headers: Record<string, string> = {
    "X-API-Key": credentials.apiKey,
    Authorization: `Bearer ${token}`,
  };
  if (rawBody) headers["content-type"] = "application/json";
  if (options.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey.slice(0, 40);
    headers["X-Idempotency-Key"] = options.idempotencyKey.slice(0, 40);
  }

  let response: Response;
  try {
    response = await fetch(`${normalizeBaseUrl(credentials.baseUrl)}${path}`, {
      method: options.method,
      headers,
      body: rawBody || undefined,
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new Error("Fireblocks request timed out");
    }
    throw error;
  }

  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text };
  }
  if (!response.ok) {
    throw new Error(
      fireblocksErrorMessage(
        parsed,
        text || `${response.status} ${response.statusText}`,
      ),
    );
  }
  return parsed as T;
}
