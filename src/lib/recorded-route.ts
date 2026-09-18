import { VENUE_ROUTES, type VenueRouteName } from "@/lib/fireblocks-desk";
import {
  routeNamedVenue,
  routeVenueFunds,
  type RouteFundsInput,
  type RouteFundsResult,
} from "@/lib/fireblocks-route";
import {
  finishTransferHistory,
  startTransferHistory,
  type TransferOrigin,
} from "@/lib/transfer-history";

export async function routeNamedVenueRecorded(
  method: VenueRouteName,
  input: Omit<RouteFundsInput, "fromVenueId" | "toVenueId"> & {
    fromVenueId?: string;
    toVenueId?: string;
  },
  origin: TransferOrigin,
): Promise<RouteFundsResult> {
  const pair = VENUE_ROUTES[method];
  const fromVenueId = input.fromVenueId ?? pair.fromVenueId;
  const toVenueId = input.toVenueId ?? pair.toVenueId;
  const record = startTransferHistory({
    origin,
    method,
    fromVenueId,
    toVenueId,
    amount: input.amount,
  });
  try {
    const result = await routeNamedVenue(method, input);
    finishTransferHistory(record.id, { result });
    return result;
  } catch (error) {
    finishTransferHistory(record.id, {
      error: error instanceof Error ? error.message : "Unable to route funds",
    });
    throw error;
  }
}

export async function routeVenueFundsRecorded(
  input: RouteFundsInput,
  origin: TransferOrigin,
): Promise<RouteFundsResult> {
  const record = startTransferHistory({
    origin,
    fromVenueId: input.fromVenueId,
    toVenueId: input.toVenueId,
    amount: input.amount,
  });
  try {
    const result = await routeVenueFunds(input);
    finishTransferHistory(record.id, { result });
    return result;
  } catch (error) {
    finishTransferHistory(record.id, {
      error: error instanceof Error ? error.message : "Unable to route funds",
    });
    throw error;
  }
}
