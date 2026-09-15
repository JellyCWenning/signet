import { QueueView } from "@/components/views/queue-view";
import { allRequests } from "@/lib/payloads";

export const dynamic = "force-dynamic";

export default function QueuePage() {
  return <QueueView initial={allRequests()} />;
}
