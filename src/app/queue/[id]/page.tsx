import { notFound } from "next/navigation";
import { RequestDetailView } from "@/components/views/request-detail-view";
import { getRequest } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function RequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const initial = getRequest(id);
  if (!initial) notFound();
  return <RequestDetailView id={id} initial={initial} />;
}
