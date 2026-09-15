import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PolicyView() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Transaction Authorization Policy"
        title="Fireblocks TAP"
        description="策略只在 Fireblocks 工作区跑一遍。Bot 能发到 Co-Signer 的交易，已经通过了那份 TAP。本服务不再做第二套规则。"
      />

      <Card className="border-teal-400/25">
        <CardHeader>
          <CardTitle>唯一策略入口</CardTitle>
          <CardDescription>在 Fireblocks Console 配 TAP，不在这里改阈值。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            工作区 TAP 按来源、目的地、资产、金额、ALLOW / BLOCK / 2-TIER（指定签名人）过滤。过不了 TAP
            的交易到不了 API Co-Signer。
          </p>
          <p>
            配对 bot 打开 callback 时，Co-Signer 仍会 POST{" "}
            <code className="font-mono text-teal-300">/v2/tx_sign_request</code>
            。本 handler 一律返回 <span className="font-mono text-teal-200">APPROVE</span>
            ，让 enclave 完成签名。也可以关掉 callback：Co-Signer 对已送达的请求直接签。
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardDescription>Fireblocks TAP</CardDescription>
            <CardTitle className="text-base">拦在工作区</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              ALLOW 才进入签名。BLOCK 的交易不会到 Co-Signer。2-TIER 走控制台指定签名人，不是本服务队列。
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>API Bot</CardDescription>
            <CardTitle className="text-base">只发已授权的交易</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              treasury-bot 作为 Signer 发出来的请求，已经过 TAP。Callback 不再重判金额或地址。
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Callback</CardDescription>
            <CardTitle className="text-base">透传 APPROVE</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              用来记账和审计。回 APPROVE 后 Co-Signer 用 enclave 分片参与 MPC，签名完成。
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
