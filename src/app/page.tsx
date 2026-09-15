import { OverviewView } from "@/components/views/overview-view";
import { pendingQueue, workspacePayload } from "@/lib/payloads";

export const dynamic = "force-dynamic";

export default function OverviewPage() {
  return (
    <OverviewView
      initialWorkspace={workspacePayload()}
      initialQueue={pendingQueue()}
    />
  );
}
