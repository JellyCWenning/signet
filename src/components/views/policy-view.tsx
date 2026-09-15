import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PolicyView() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Transaction Authorization Policy"
        title="Fireblocks TAP"
        description="在 Fireblocks Console 改策略。本服务不保存 TAP，Callback 已关闭。"
      />

      <Card className="border-teal-400/25">
        <CardHeader>
          <CardTitle>怎么改 TAP</CardTitle>
          <CardDescription>
            推荐在 Console 改。文档：{" "}
            <a
              className="text-teal-300 underline-offset-2 hover:underline"
              href="https://developers.fireblocks.com/docs/set-transaction-authorization-policy"
              target="_blank"
              rel="noreferrer"
            >
              Set Policies
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">Console（推荐）</p>
            <ol className="mt-2 list-decimal space-y-2 pl-5">
              <li>Fireblocks Console → Settings → Policy Editor（Transaction Authorization Policy）。</li>
              <li>
                规则从上到下匹配。先写严的（例如 BLOCK 一次性地址），再写 ALLOW（金额上限、白名单、内部 vault）。
              </li>
              <li>
                动作只有三种：ALLOW（放行并由已配对 Co-Signer 签）、BLOCK（直接拒绝）、2-TIER（Console
                里的人审，不是本服务队列）。
              </li>
              <li>
                保存后 Owner / Admin 会收到 Review Policy changes，在 Fireblocks 手机 App 上确认后才生效。
              </li>
            </ol>
          </div>
          <div>
            <p className="font-medium text-foreground">API（Policy Editor V2）</p>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                看当前规则：{" "}
                <code className="font-mono text-teal-300">GET /v1/policy/active_policy?policyType=TRANSFER</code>
              </li>
              <li>
                改草稿：<code className="font-mono text-teal-300">PUT /v1/policy/draft</code>（body 带
                policyTypes + rules）
              </li>
              <li>
                发布：<code className="font-mono text-teal-300">POST /v1/policy/draft</code>（draft id）
              </li>
            </ul>
            <p className="mt-2">
              鉴权是 API key + RSA 私钥签 JWT，不是只给一把 key。权限必须是 Owner / Admin / Non-Signing
              Admin。Signer bot 的 key 看不到 TAP。
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card size="sm">
          <CardHeader>
            <CardDescription>Enclave</CardDescription>
            <CardTitle className="text-base">私钥分片住的地方</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Co-Signer 跑在 SGX / Nitro / Confidential Space 里。Callback 关掉后，TAP 放行的交易会在这里直接签。
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Callback</CardDescription>
            <CardTitle className="text-base">已关闭</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Co-Signer 不再 POST 本服务。配对 bot 仍需要，否则 enclave 不会给这个 API user 签字。
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
