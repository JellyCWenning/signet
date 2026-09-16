/**
 * Catalog checks for later developers. No Fireblocks network calls.
 *   node --experimental-strip-types --test scripts/check-desk-rails.mts
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DESK_RAILS,
  destForKind,
  hyperliquidWithdrawToCover,
  parsePositiveUsd,
  railById,
  railForVenue,
  resolveVenueRoute,
  venueKindOnRail,
  assertErc20TransferCredits,
} from "../src/lib/fireblocks-desk.ts";

test("eason_albert rail is the proven HL ↔ Lighter vault", () => {
  const rail = railById("eason_albert");
  assert.equal(rail.vaultId, "3");
  assert.equal(rail.arbUsdcAssetId, "USDC_ARB_3SBJ");
  assert.equal(rail.l1Address, "0x6759b70EA668e076180c06085d51449FB0d7EE90");
  assert.equal(rail.hyperliquidVenueId, "hyperliquid_fireblocks");
  assert.equal(rail.lighterVenueId, "lighter_fireblocks");
  assert.equal(rail.lighterAccountIndex, "747083");
  assert.equal(destForKind(rail, "lighter").id, "ec38a57b-3656-4b1d-b122-a1ac3f1422ac");
  assert.equal(destForKind(rail, "hyperliquid").id, "0688ebcf-3b2a-42cf-ba92-7be2ad93b986");
});

test("venue ids resolve onto the same rail", () => {
  assert.equal(railForVenue("hyperliquid_fireblocks").id, "eason_albert");
  assert.equal(railForVenue("lighter_fireblocks").id, "eason_albert");
  assert.equal(venueKindOnRail(railById("eason_albert"), "hyperliquid_fireblocks"), "hyperliquid");
  assert.throws(() => railForVenue("unknown_venue"), /not on a desk rail/);
});

test("HL → Lighter pairs onto the Lighter allowlisted dest", () => {
  const route = resolveVenueRoute("hyperliquid_fireblocks", "lighter_fireblocks");
  assert.equal(route.rail.id, "eason_albert");
  assert.equal(route.fromKind, "hyperliquid");
  assert.equal(route.toKind, "lighter");
  assert.equal(route.dest.name, "lighter contract_eason");
  assert.equal(route.dest.credit, "relay_deposit_erc20");
  assert.throws(() => assertErc20TransferCredits(route.dest), /Relay Depository/);
});

test("Lighter → HL pairs onto the Hyperliquid allowlisted dest", () => {
  const route = resolveVenueRoute("lighter_fireblocks", "hyperliquid_fireblocks");
  assert.equal(route.toKind, "hyperliquid");
  assert.equal(route.dest.id, "0688ebcf-3b2a-42cf-ba92-7be2ad93b986");
});

test("same venue and unknown amounts are rejected", () => {
  assert.throws(
    () => resolveVenueRoute("hyperliquid_fireblocks", "hyperliquid_fireblocks"),
    /must be different/,
  );
  assert.throws(() => parsePositiveUsd("0"), /greater than 0/);
  assert.throws(() => parsePositiveUsd(""), /greater than 0/);
});

test("HL withdraw covers the shortfall plus the $1 fee", () => {
  assert.equal(hyperliquidWithdrawToCover(5, 1), null);
  assert.equal(hyperliquidWithdrawToCover(0, 1), "2");
  assert.equal(hyperliquidWithdrawToCover(0.25, 1), "1.75");
});

test("every rail has a vault, L1, asset, and at least one destination", () => {
  assert.ok(DESK_RAILS.length >= 1);
  for (const rail of DESK_RAILS) {
    assert.ok(rail.vaultId);
    assert.match(rail.l1Address, /^0x[0-9a-fA-F]{40}$/);
    assert.ok(rail.arbUsdcAssetId);
    assert.ok(rail.destinations.lighter || rail.destinations.hyperliquid);
  }
});
