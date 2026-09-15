import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function FlowView() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="End to end"
        title="从发出信号到完成 Sign"
        description="发起一笔转账之后，Fireblocks 云端分片和 API Co-Signer 的 enclave 分片要一起做 MPC。Co-Signer 在动手前问本服务 TAP：通过就立刻 APPROVE，然后才签字。"
      />

      <Card className="border-teal-400/25">
        <CardHeader>
          <CardTitle>全流程</CardTitle>
          <CardDescription>
            一条路径走完：发出信号 → callback TAP → Co-Signer 签名 → MPC 合成 → 完成。ALLOW
            不经过人；BLOCK 在签字前就失败；2-TIER 用同一 requestId 重试直到人审给出终态。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FullSignPipeline />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-tight">三条出口</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <MapCard
            tap="ALLOW"
            action="APPROVE"
            tone="pass"
            title="通过 → 完成 sign"
            steps={[
              "live TAP 第一条命中为 ALLOW",
              "callback 立刻回 APPROVE",
              "Co-Signer 用 enclave 分片参与 MPC",
              "合成签名，Fireblocks 广播，sign 完成",
            ]}
          />
          <MapCard
            tap="BLOCK"
            action="REJECT"
            tone="fail"
            title="拒绝 → 永不签名"
            steps={[
              "命中 BLOCK（例如一次性地址）",
              "callback 回 REJECT + rejectionReason",
              "该 requestId 终态，Co-Signer 不签",
              "交易失败，不能改成人工补签",
            ]}
          />
          <MapCard
            tap="2-TIER"
            action="RETRY"
            tone="hold"
            title="挂起 → 人审后再签"
            steps={[
              "大额、合约调用、改 TAP 等",
              "callback 回 RETRY（30s 内）",
              "队列或 Ops Bot /approve /reject",
              "Fireblocks 用同一 requestId 再问，带回终态后才 sign",
            ]}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-tight">改 TAP 不打断这条签名链</h2>
        <p className="text-xs text-muted-foreground">
          正在飞的转账仍按当时的 live TAP 判定。改阈值只另开一笔 POLICY_APPROVAL，人签完才换 live
          规则，下一笔新信号才走新上限。
        </p>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
          <Step n="1" title="改阈值 / 加规则" detail="桌上 Save 或新增" />
          <Arrow />
          <Step n="2" title="POLICY_APPROVAL" detail="草稿，live 不变" />
          <Arrow />
          <Step n="3" title="配置 callback 回 RETRY" detail="不自动改 TAP" />
          <Arrow />
          <Step n="4" title="人审 Approve & sign" detail="这才写入 live TAP" accent />
        </div>
      </section>
    </div>
  );
}

function FullSignPipeline() {
  return (
    <ol className="space-y-0">
      {STAGES.map((stage, index) => (
        <li key={stage.n} className="grid grid-cols-[2.25rem_1fr] gap-3">
          <div className="flex flex-col items-center">
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-[11px]",
                stage.tone === "pass" && "bg-teal-400/20 text-teal-200",
                stage.tone === "fail" && "bg-red-400/20 text-red-200",
                stage.tone === "hold" && "bg-amber-400/20 text-amber-200",
                stage.tone === "step" && "bg-muted text-muted-foreground",
                stage.tone === "tap" && "bg-teal-400/25 text-teal-100",
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
  );
}

const STAGES = [
  {
    n: "1",
    lane: "发出信号",
    title: "API Bot 或操作员发起转账",
    detail:
      "在 Fireblocks 工作区创建 TRANSFER / CONTRACT_CALL。Signer 必须是已配对 Co-Signer 的 API user（treasury-bot）。",
    code: "create transaction · signerId = api_signer_treasury",
    tone: "step" as const,
  },
  {
    n: "2",
    lane: "Fireblocks 云",
    title: "工作区收下交易，准备 MPC",
    detail:
      "云端持有一份 MPC 分片。它不会单独出完整签名，必须拉齐 Co-Signer 的 enclave 分片。",
    tone: "step",
  },
  {
    n: "3",
    lane: "API Co-Signer",
    title: "Enclave 收到待签请求",
    detail:
      "配对 bot 若打开了 callback，Co-Signer 在参与签名前必须先问本服务，30 秒内要有回包。",
    code: "callback URL = 本服务 origin",
    tone: "step",
  },
  {
    n: "4",
    lane: "本服务 callback",
    title: "Co-Signer POST 签名请求",
    detail:
      "Fireblocks 在 origin 后追加路径。新 requestId 入队并跑 TAP；同一 requestId 再来只返回已有终态，不再重判。",
    code: "POST /v2/tx_sign_request",
    tone: "tap",
  },
  {
    n: "5",
    lane: "本服务 TAP",
    title: "live TAP 从上到下，第一条命中生效",
    detail:
      "这是我们自己的规则，不是 Fireblocks 控制台 TAP。ALLOW / BLOCK / 2-TIER 在这里决定。",
    code: "evaluate live rules · first match wins",
    tone: "tap",
  },
  {
    n: "6a",
    lane: "通过",
    title: "TAP ALLOW → 立刻 APPROVE",
    detail:
      "例如金库互转 ≤ $25k、白名单目的地 ≤ $100k。回包后 Co-Signer 立即用 enclave 分片参与本次签名。",
    code: '{ "action": "APPROVE", "requestId" }',
    tone: "pass",
  },
  {
    n: "6b",
    lane: "拒绝",
    title: "TAP BLOCK → REJECT，流程在此结束",
    detail: "例如一次性地址。Co-Signer 不签名。这笔交易失败且不能改成人工补签。",
    code: '{ "action": "REJECT", "requestId", "rejectionReason" }',
    tone: "fail",
  },
  {
    n: "6c",
    lane: "挂起",
    title: "TAP 2-TIER → RETRY，等人",
    detail:
      "超阈值、合约调用、改配置。写入队列并 ping Ops Bot。Fireblocks 超时后用同一 requestId 再 POST。",
    code: '{ "action": "RETRY", "requestId" }',
    tone: "hold",
  },
  {
    n: "7",
    lane: "人审（仅 2-TIER）",
    title: "桌上 Approve & sign，或 Bot /approve",
    detail:
      "APPROVE / REJECT / IGNORE（IGNORE 仅配置类，不能用于 tx_sign）。下一次 callback 带回这个终态。",
    code: "POST /api/queue/:id  或  /approve req_…",
    tone: "hold",
  },
  {
    n: "8",
    lane: "完成 Sign",
    title: "Co-Signer 签字 + 云端分片合成",
    detail:
      "只有拿到 APPROVE 才会走到这里。两边 MPC 分片合成完整签名，Fireblocks 广播交易，sign 完成。",
    code: "enclave share + cloud share → signed tx",
    tone: "pass",
  },
];

function Step({
  n,
  title,
  detail,
  accent,
}: {
  n: string;
  title: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-0 flex-1 rounded-lg border px-3 py-3",
        accent ? "border-teal-400/40 bg-teal-400/10" : "border-border/80 bg-background/50",
      )}
    >
      <p className="font-mono text-[10px] text-muted-foreground">{n}</p>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex items-center justify-center px-1 text-teal-300/80" aria-hidden>
      <span className="rotate-90 lg:rotate-0">→</span>
    </div>
  );
}

function MapCard({
  tap,
  action,
  tone,
  title,
  steps,
}: {
  tap: string;
  action: string;
  tone: "pass" | "fail" | "hold";
  title: string;
  steps: string[];
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        tone === "pass" && "border-teal-400/30",
        tone === "fail" && "border-red-400/30",
        tone === "hold" && "border-amber-400/30",
      )}
    >
      <p className="font-mono text-xs text-muted-foreground">
        TAP {tap} → {action}
      </p>
      <p className="mt-1 font-medium">{title}</p>
      <ol className="mt-3 space-y-1.5 text-xs text-muted-foreground">
        {steps.map((step) => (
          <li key={step}>· {step}</li>
        ))}
      </ol>
    </div>
  );
}
