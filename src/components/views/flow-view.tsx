import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function FlowView() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="End to end"
        title="从发出信号到完成 Sign"
        description="Callback 已关闭。策略只走 Fireblocks TAP。过关后 Co-Signer 在 enclave 里直接签字。"
      />

      <Card>
        <CardHeader>
          <CardTitle>Enclave 是什么</CardTitle>
          <CardDescription>不是另一套 TAP，是 Co-Signer 放私钥分片的隔离环境。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Fireblocks 用 MPC：云端一份密钥分片，客户这边一份。客户这份跑在受硬件保护的隔离区里，叫
            enclave（Intel SGX、AWS Nitro、GCP Confidential Space）。里面的代码能签名，但私钥分片拿不出来。
          </p>
          <p>
            关掉 callback 之后，enclave 收到「请签字」就签，不再问本服务。拦交易的仍然是 Fireblocks TAP。
          </p>
        </CardContent>
      </Card>

      <Card className="border-teal-400/25">
        <CardHeader>
          <CardTitle>全流程</CardTitle>
          <CardDescription>没有本地 TAP，也没有 callback 往返。</CardDescription>
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
    accent: false,
  },
  {
    n: "2",
    lane: "Fireblocks TAP",
    title: "工作区 TAP 过滤（唯一策略）",
    detail: "来源、目的地、资产、金额、ALLOW / BLOCK / 2-TIER。过不了的交易到不了 Co-Signer。",
    accent: true,
  },
  {
    n: "3",
    lane: "Fireblocks 云",
    title: "云端 MPC 分片准备签名",
    detail: "只有 TAP 放行的交易才会请 API Co-Signer。",
    accent: false,
  },
  {
    n: "4",
    lane: "API Co-Signer · Enclave",
    title: "隔离环境里直接签字",
    detail: "Callback 已关。Enclave 收到请求就用自己那份密钥分片参与 MPC。",
    accent: true,
  },
  {
    n: "5",
    lane: "完成 Sign",
    title: "两份分片合成完整签名并广播",
    detail: "云端分片 + enclave 分片 → signed tx。",
    accent: true,
  },
];
