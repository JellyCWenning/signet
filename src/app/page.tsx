import { ConsoleView } from "@/components/views/console-view";
import { listVenueSnapshots } from "@/lib/venue-store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const venues = await listVenueSnapshots();
  return (
    <ConsoleView initial={{ venues, armedCount: venues.filter((item) => item.armed).length }} />
  );
}
