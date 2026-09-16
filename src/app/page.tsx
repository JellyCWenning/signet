import { OverviewView } from "@/components/views/overview-view";
import { listVenueSnapshots } from "@/lib/venue-store";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const venues = await listVenueSnapshots();
  return (
    <OverviewView
      initialVenues={{ venues, armedCount: venues.filter((item) => item.armed).length }}
    />
  );
}
