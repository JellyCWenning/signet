import { SettingsView } from "@/components/views/settings-view";
import { getSettings, getStats } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return <SettingsView initial={{ settings: getSettings(), stats: getStats() }} />;
}
