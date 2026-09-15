import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function FlowView() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="End to end"
        title="从发出信号到完成 Sign"
        description="策略只走 Fireblocks TAP。Bot 发出的交易已经过关，callback 透传 APPROVE，Co-Signer 签字完成。"
      />

      <Card className="border-teal-400/25">
        <CardHeader>
          <CardTitle>全流程</CardTitle>
          <CardDescription>
            没有第二套 TAP。过不了 Fireblocks TAP 的请求到不了 Co-Signer。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-0">
            {STAGES.map((stage, index) => (
              <li key={stage.n} className="grid grid-cols-[2.25rem_1fr] gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-[11px]",
                      stage.accent ? "bg-teal-400/20 text-teal-200" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {stage.n}
                  </span>
                  {index < STAGES.length - 1 ? (
                    <span className="w-px flex-1 bg-border" aria-hidden />
                  ) : null}
                </div>
                <div className={cn("pb-6", index === STAGES.length - 1 && "pb-0")}>
                  <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
                    {stage.lane}
                  </p>
                  <p className="text-sm font-medium">{stage.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{stage.detail}</p>
                  {stage.code ? (
                    <p className="mt-1 font-mono text-[11px] text-teal-300">{stage.code}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

const STAGES = [
  {
    n: "1",
    lane: "发出信号",
    title: "API Bot 发起转账",
    detail: "treasury-bot 在 Fireblocks 创建 TRANSFER / CONTRACT_CALL。",
    code: "create transaction · signer = 配对的 API user",
    accent: false,
  },
  {
    n: "2",
    lane: "Fireblocks TAP",
    title: "工作区 TAP 过滤（唯一策略）",
    detail:
      "来源、目的地、资产、金额、ALLOW / BLOCK / 2-TIER 都在这里。过不了的交易到不了 Co-Signer。",
    code: "workspace TAP · first match wins",
    accent: true,
  },
  {
    n: "3",
    lane: "Fireblocks 云",
    title: "云端 MPC 分片准备签名",
    detail: "只有 TAP 放行的交易才会请 API Co-Signer 出 enclave 分片。",
    accent: false,
  },
  {
    n: "4",
    lane: "API Co-Signer",
    title: "Enclave 收到待签请求",
    detail: "若开了 callback，先 POST 本服务；关掉 callback 则直接签。",
    code: "callback URL = 本服务 origin",
    accent: false,
  },
  {
    n: "5",
    lane: "Callback（可选）",
    title: "一律 APPROVE",
    detail:
      "不再跑本地 TAP。请求能到这里，说明 Fireblocks TAP 已经授权。回 APPROVE 让 Co-Signer 继续。",
    code: 'POST /v2/tx_sign_request → { "action": "APPROVE" }',
    accent: true,
  },
  {
    n: "6",
    lane: "完成 Sign",
    title: "enclave 分片 + 云端分片 → 完整签名",
    detail: "MPC 合成后 Fireblocks 广播交易，sign 完成。",
    code: "enclave share + cloud share → signed tx",
    accent: true,
  },
];
