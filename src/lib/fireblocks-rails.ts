/**
 * Public Fireblocks desk routing API.
 *
 * Add another vault the same way: one `DESK_RAILS` row, matching TAP venues,
 * Fireblocks allowlists + TAP ALLOW, then `routeHyperliquidToLighter` /
 * `routeLighterToHyperliquid`. Cookbook: docs/ROUTING.md.
 */
export {
  DESK_RAILS,
  HYPERLIQUID_ARB_BRIDGE2,
  HYPERLIQUID_DEPOSIT_MIN_USDC,
  HYPERLIQUID_WITHDRAW_FEE_USDC,
  LIGHTER_WITHDRAW_GAS_USDC,
  destForKind,
  hyperliquidWithdrawToCover,
  isVenueRouteName,
  listDeskRails,
  parsePositiveUsd,
  railById,
  railForVenue,
  resolveVenueRoute,
  venueKindOnRail,
  assertErc20TransferCredits,
  assertHyperliquidDepositDest,
  assertVaultOnlyDest,
  VENUE_ROUTES,
  type AllowlistedDest,
  type DestCredit,
  type DeskRail,
  type ResolvedVenueRoute,
  type VenueKindOnRail,
  type VenueRouteName,
} from "@/lib/fireblocks-desk";
export {
  ensureVaultUsdc,
  routeHyperliquidToLighter,
  routeLighterToHyperliquid,
  routeNamedVenue,
  routeVenueFunds,
  signAndSubmitHyperliquidWithdraw,
  type RouteFundsInput,
  type RouteFundsResult,
  type RouteStep,
} from "@/lib/fireblocks-route";
export {
  assertAutoSigned,
  createFireblocksApprove,
  createFireblocksContractCall,
  createFireblocksEthMessage,
  createFireblocksTransfer,
  createFireblocksTypedMessage,
  eip712SignatureFromTx,
  ethPersonalSignatureFromTx,
  waitForFireblocksTx,
  waitForVaultAsset,
} from "@/lib/fireblocks-tx";
export { hyperliquidWithdrawTypedData, submitHyperliquidWithdraw } from "@/lib/hyperliquid-withdraw";
