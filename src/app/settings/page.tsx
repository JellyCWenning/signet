import { SettingsView } from "@/components/views/settings-view";
import { workspacePayload } from "@/lib/payloads";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return <SettingsView initial={workspacePayload()} />;
}
