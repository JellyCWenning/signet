import { BotView } from "@/components/views/bot-view";
import { botPayload, workspacePayload } from "@/lib/payloads";

export const dynamic = "force-dynamic";

export default function BotPage() {
  const workspace = workspacePayload();
  return (
    <BotView
      initialWorkspace={{
        apiUsers: workspace.apiUsers,
        cosigners: workspace.cosigners,
      }}
      initialChat={botPayload()}
    />
  );
}
