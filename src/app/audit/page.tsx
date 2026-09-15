import { AuditView } from "@/components/views/audit-view";
import { auditPayload } from "@/lib/payloads";

export const dynamic = "force-dynamic";

export default function AuditPage() {
  return <AuditView initial={auditPayload()} />;
}
