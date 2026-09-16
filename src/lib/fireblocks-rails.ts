/**
 * Public Fireblocks desk routing API.
 *
 * Add another vault the same way: one `DESK_RAILS` row, matching TAP venues,
 * Fireblocks allowlists + TAP ALLOW, then `routeVenueFunds`. See docs/MANUAL.md.
 */
export {
  DESK_RAILS,
  HYPERLIQUID_WITHDRAW_FEE_USDC,
  destForKind,
  hyperliquidWithdrawToCover,
  listDeskRails,
  parsePositiveUsd,
  railById,
  railForVenue,
  resolveVenueRoute,
  venueKindOnRail,
  assertErc20TransferCredits,
  type AllowlistedDest,
  type DestCredit,
  type DeskRail,
  type ResolvedVenueRoute,
  type VenueKindOnRail,
} from "@/lib/fireblocks-desk";
export {
  ensureVaultUsdc,
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
  createFireblocksTransfer,
  createFireblocksTypedMessage,
  eip712SignatureFromTx,
  waitForFireblocksTx,
  waitForVaultAsset,
} from "@/lib/fireblocks-tx";
export { hyperliquidWithdrawTypedData, submitHyperliquidWithdraw } from "@/lib/hyperliquid-withdraw";
