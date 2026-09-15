export interface AccountDirectoryEntry {
  id: string;
  name: string;
  type: "VAULT" | "EXCHANGE" | "UNMANAGED" | "NETWORK_CONNECTION";
}

export const ACCOUNTS: Record<string, AccountDirectoryEntry> = {
  "0": { id: "0", name: "Treasury Hot", type: "VAULT" },
  "1": { id: "1", name: "Treasury Cold", type: "VAULT" },
  "3": { id: "3", name: "Yield Ops", type: "VAULT" },
  "7": { id: "7", name: "OTC Desk", type: "VAULT" },
  "12": { id: "12", name: "Gas Station", type: "VAULT" },
  "21": { id: "21", name: "Payroll Buffer", type: "VAULT" },
  coinbase_prime: {
    id: "coinbase_prime",
    name: "Coinbase Prime",
    type: "EXCHANGE",
  },
  kraken: { id: "kraken", name: "Kraken", type: "EXCHANGE" },
  otc_copper: {
    id: "otc_copper",
    name: "Copper ClearLoop",
    type: "NETWORK_CONNECTION",
  },
};

export function resolveAccount(
  id?: string,
  fallbackType?: string,
): AccountDirectoryEntry | undefined {
  if (!id) return undefined;
  return (
    ACCOUNTS[id] ?? {
      id,
      name: id,
      type: (fallbackType as AccountDirectoryEntry["type"]) ?? "VAULT",
    }
  );
}
