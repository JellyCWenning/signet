import { handleCallback } from "@/lib/handle-callback";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleCallback("tx_sign", request);
}
