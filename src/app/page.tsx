import { OverviewView } from "@/components/views/overview-view";
import { recentSigned, workspacePayload } from "@/lib/payloads";

export const dynamic = "force-dynamic";

export default function OverviewPage() {
  return (
    <OverviewView
      initialWorkspace={workspacePayload()}
      initialQueue={recentSigned()}
    />
  );
}
