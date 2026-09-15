const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const USD_PRECISE = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function formatUsd(value?: number, precise = false): string {
  if (value == null || Number.isNaN(value)) return "—";
  return (precise || Math.abs(value) < 1000 ? USD_PRECISE : USD).format(value);
}

export function formatAmount(amount?: string, assetId?: string): string {
  if (!amount) return "—";
  const numeric = Number(amount);
  if (Number.isNaN(numeric)) return `${amount} ${assetId ?? ""}`.trim();
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: numeric >= 100 ? 2 : 6,
  }).format(numeric);
  return assetId ? `${formatted} ${assetId}` : formatted;
}

export function truncateAddress(address?: string, size = 6): string {
  if (!address) return "—";
  if (address.length <= size * 2 + 3) return address;
  return `${address.slice(0, size)}…${address.slice(-size)}`;
}

export function relativeTime(iso: string, now = Date.now()): string {
  const delta = new Date(iso).getTime() - now;
  const abs = Math.abs(delta);
  const minutes = Math.round(abs / 60_000);
  const hours = Math.round(abs / 3_600_000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 45_000) return delta >= 0 ? "in a few seconds" : "just now";
  if (minutes < 60) return rtf.format(Math.sign(delta) * minutes, "minute");
  if (hours < 24) return rtf.format(Math.sign(delta) * hours, "hour");
  return rtf.format(
    Math.sign(delta) * Math.round(abs / 86_400_000),
    "day",
  );
}

export function formatTimestamp(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function enclaveLabel(enclave: string): string {
  switch (enclave) {
    case "AWS_NITRO":
      return "AWS Nitro";
    case "INTEL_SGX":
      return "Intel SGX";
    case "GCP_CONFIDENTIAL_SPACE":
      return "Confidential Space";
    default:
      return enclave;
  }
}

export function kindLabel(kind: string): string {
  switch (kind) {
    case "tx_sign":
      return "Signing";
    case "tx_approval":
      return "Approval";
    case "config_change":
      return "Config";
    default:
      return kind;
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Awaiting review";
    case "approved":
      return "Signed";
    case "rejected":
      return "Rejected";
    case "auto_approved":
      return "Auto-signed";
    case "auto_rejected":
      return "Auto-rejected";
    case "ignored":
      return "Ignored";
    default:
      return status;
  }
}
