/**
 * Desk routing catalog — the reuse point for every Fireblocks-bound account.
 *
 * Later developers: copy one `DESK_RAILS` row, seed matching venue ids in
 * `venues.ts`, allowlist the destination wallets in Fireblocks Console, and
 * keep TAP ALLOW + designated signer covering TRANSFER, TYPED_MESSAGE, and
 * CONTRACT_CALL (Lighter is Relay depositErc20, not ERC20 TRANSFER).
 * Then call `routeVenueFunds` (or POST `/api/fireblocks/route`). Same flow.
 */

export type VenueKindOnRail = "hyperliquid" | "lighter";

export type DestCredit = "erc20_transfer" | "relay_deposit_erc20";

export interface AllowlistedDest {
  type: "EXTERNAL_WALLET" | "INTERNAL_WALLET" | "VAULT_ACCOUNT";
  id: string;
  name: string;
  address?: string;
  /**
   * How USDC actually credits on the venue.
   * `relay_deposit_erc20` is Relay Depository `depositErc20` — a Fireblocks
   * TRANSFER does **not** credit (1 USDC tx 0x92de68a8… sat in the contract).
   */
  credit?: DestCredit;
}

export interface DeskRail {
  id: string;
  displayName: string;
  vaultId: string;
  l1Address: string;
  arbUsdcAssetId: string;
  hyperliquidVenueId?: string;
  lighterVenueId?: string;
  /** Lighter account_index for this L1 (Relay quote `recipient`). */
  lighterAccountIndex?: string;
  /** Fireblocks native gas asset on the deposit chain (Arbitrum). */
  gasAssetId?: string;
  destinations: {
    lighter?: AllowlistedDest;
    hyperliquid?: AllowlistedDest;
  };
}

/** Hyperliquid Arbitrum withdraw fee, charged on top of the requested amount. */
export const HYPERLIQUID_WITHDRAW_FEE_USDC = "1";

export const DESK_RAILS: DeskRail[] = [
  {
    id: "eason_albert",
    displayName: "Eason Albert (vault 3)",
    vaultId: "3",
    l1Address: "0x6759b70EA668e076180c06085d51449FB0d7EE90",
    arbUsdcAssetId: "USDC_ARB_3SBJ",
    hyperliquidVenueId: "hyperliquid_fireblocks",
    lighterVenueId: "lighter_fireblocks",
    lighterAccountIndex: "747083",
    gasAssetId: "ETH-AETH",
    destinations: {
      lighter: {
        type: "EXTERNAL_WALLET",
        id: "ec38a57b-3656-4b1d-b122-a1ac3f1422ac",
        name: "lighter contract_eason",
        address: "0x4cd00e387622c35bddb9b4c962c136462338bc31",
        credit: "relay_deposit_erc20",
      },
      hyperliquid: {
        type: "EXTERNAL_WALLET",
        id: "0688ebcf-3b2a-42cf-ba92-7be2ad93b986",
        name: "Hyperliquid contract address",
        address: "0xa95d9c1f655341597c94393fddc30cf3c08e4fce",
      },
    },
  },
];

export function listDeskRails(): DeskRail[] {
  return DESK_RAILS.map((rail) => structuredClone(rail));
}

export function railById(id: string): DeskRail {
  const found = DESK_RAILS.find((rail) => rail.id === id);
  if (!found) throw new Error(`Unknown desk rail ${id}`);
  return found;
}

export function railForVenue(venueId: string): DeskRail {
  const found = DESK_RAILS.find(
    (rail) => rail.hyperliquidVenueId === venueId || rail.lighterVenueId === venueId,
  );
  if (!found) {
    throw new Error(
      `Venue ${venueId} is not on a desk rail. Add a DESK_RAILS entry in src/lib/fireblocks-desk.ts.`,
    );
  }
  return found;
}

export function venueKindOnRail(rail: DeskRail, venueId: string): VenueKindOnRail {
  if (rail.hyperliquidVenueId === venueId) return "hyperliquid";
  if (rail.lighterVenueId === venueId) return "lighter";
  throw new Error(`Venue ${venueId} is not on rail ${rail.id}`);
}

export function destForKind(rail: DeskRail, kind: VenueKindOnRail): AllowlistedDest {
  const dest = kind === "lighter" ? rail.destinations.lighter : rail.destinations.hyperliquid;
  if (!dest) {
    throw new Error(`Rail ${rail.id} has no ${kind} destination. Add it in fireblocks-desk.ts.`);
  }
  return dest;
}

export interface ResolvedVenueRoute {
  rail: DeskRail;
  fromKind: VenueKindOnRail;
  toKind: VenueKindOnRail;
  dest: AllowlistedDest;
}

/** Pair two TAP venue ids onto one vault rail. Cross-vault is not wired. */
export function resolveVenueRoute(fromVenueId: string, toVenueId: string): ResolvedVenueRoute {
  const fromRail = railForVenue(fromVenueId);
  const toRail = railForVenue(toVenueId);
  if (fromRail.id !== toRail.id) {
    throw new Error(
      `Venues ${fromVenueId} and ${toVenueId} are on different vaults. Cross-vault routing is not wired yet.`,
    );
  }
  const fromKind = venueKindOnRail(fromRail, fromVenueId);
  const toKind = venueKindOnRail(toRail, toVenueId);
  if (fromKind === toKind) throw new Error("from and to must be different venues");
  return { rail: fromRail, fromKind, toKind, dest: destForKind(fromRail, toKind) };
}

export function parsePositiveUsd(amount: string): number {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) throw new Error("amount must be greater than 0");
  return n;
}

export function addUsd(left: string, right: string): string {
  const sum = Number(left) + Number(right);
  if (!Number.isFinite(sum) || sum < 0) throw new Error("Invalid USD amount");
  return String(sum);
}

/**
 * Extra USDC to withdraw from Hyperliquid so the vault can cover `requested`.
 * Returns null when the vault already holds enough. HL charges $1 on top.
 */
export function assertErc20TransferCredits(dest: AllowlistedDest): void {
  if (dest.credit === "relay_deposit_erc20") {
    throw new Error(
      `${dest.name} is Relay Depository 0x4cd00e… — ERC20 TRANSFER does not credit Lighter. ` +
        `Need Relay quote (POST https://api.relay.link/quote/v2, toChainId 3586256, recipient=account_index) then Fireblocks CONTRACT_CALL depositErc20. ` +
        `Incident: tx 0x92de68a82ba47e4ed3249c5a8004f022b0e227932e8ce032868054ffc396e70a (1 USDC) Relay status unknown; Lighter 747083 unchanged.`,
    );
  }
}

export function hyperliquidWithdrawToCover(available: number, requested: number): string | null {
  if (!Number.isFinite(available) || available < 0) throw new Error("Invalid vault available");
  if (!Number.isFinite(requested) || requested <= 0) throw new Error("amount must be greater than 0");
  if (available + 1e-9 >= requested) return null;
  return addUsd(String(requested - available), HYPERLIQUID_WITHDRAW_FEE_USDC);
}
