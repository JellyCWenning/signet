import { AccountsView } from "@/components/views/accounts-view";
import { listVenueSnapshots } from "@/lib/venue-store";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const venues = await listVenueSnapshots();
  return <AccountsView initial={{ venues, armedCount: venues.filter((item) => item.armed).length }} />;
}
