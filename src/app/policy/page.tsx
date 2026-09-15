import { PolicyView } from "@/components/views/policy-view";
import { policyPayload } from "@/lib/payloads";

export const dynamic = "force-dynamic";

export default function PolicyPage() {
  return <PolicyView initial={policyPayload()} />;
}
