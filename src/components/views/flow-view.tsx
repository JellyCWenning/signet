import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function FlowView() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Design"
        title="流程设计"
        description="Co-Signer 在签名前把请求 POST 到本服务 callback。我们用自己的 TAP 判定：通过就立刻回 APPROVE，Co-Signer 才签字。"
      />

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-tight">1. 角色与接线</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <Actor
            n="1"
            title="API Bot"
            detail="Fireblocks API user，例如 treasury-bot。只给配对的 Co-Signer 当 Signer。"
          />
          <Actor
            n="2"
            title="API Co-Signer"
            detail="Enclave 里的 MPC 分片。签名前 POST callback，30s 内要回 action。"
          />
          <Actor
            n="3"
            title="本服务 TAP"
            detail="我们自己的规则表，不是 Fireblocks 控制台 TAP。第一条命中的 live 规则生效。"
            accent
          />
          <Actor
            n="4"
            title="操作员 / Ops Bot"
            detail="2-TIER 和 TAP 改动走队列。/approve /reject 与桌上 Approve 等价。"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          接线：Co-Signer callback URL = 本服务 origin。Fireblocks 会自动拼{" "}
          <code className="font-mono text-teal-300">/v2/tx_sign_request</code> 和{" "}
          <code className="font-mono text-teal-300">/v2/config_change_sign_request</code>。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-tight">2. 转账签名主流程</h2>
        <Card>
          <CardHeader>
            <CardTitle>Callback → TAP → 回包</CardTitle>
            <CardDescription>
              同一 requestId 超时会重试。已有终态则原样返回，不再重跑 TAP。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignFlow />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-tight">3. TAP 判定映射</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <MapCard
            tap="ALLOW"
            action="APPROVE"
            tone="pass"
            title="通过就返回通过"
            steps={[
              "命中 live 规则且决策为 ALLOW",
              "callback 立刻 { action: APPROVE }",
              "Co-Signer 参与签名，交易继续",
            ]}
          />
          <MapCard
            tap="BLOCK"
            action="REJECT"
            tone="fail"
            title="策略拒绝"
            steps={[
              "命中 BLOCK 规则（例如一次性地址）",
              "callback 回 { action: REJECT, rejectionReason }",
              "该笔交易永久失败，不能改成人工签",
            ]}
          />
          <MapCard
            tap="2-TIER"
            action="RETRY"
            tone="hold"
            title="人工复核"
            steps={[
              "未自动通过：大额、合约调用、改配置",
              "callback 回 RETRY，写入队列",
              "人/Bot 决定后，Fireblocks 用同一 requestId 再问一次",
            ]}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-tight">4. TAP 变更（必须人审）</h2>
        <Card>
          <CardHeader>
            <CardTitle>改阈值不会立刻生效</CardTitle>
            <CardDescription>
              Save / 新增规则只产生 POLICY_APPROVAL。live TAP 要等队列里 Approve &amp; sign。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PolicyFlow />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Actor({
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
        "rounded-xl border p-4",
        accent ? "border-teal-400/35 bg-teal-400/8" : "border-border/80 bg-card/60",
      )}
    >
      <p className="font-mono text-[11px] text-teal-300">0{n}</p>
      <p className="mt-1 font-medium">{title}</p>
      <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function SignFlow() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
        <Step n="A" title="工作区发起转账" detail="Vault / 交易所 / 合约调用" />
        <Arrow />
        <Step n="B" title="Fireblocks 云" detail="MPC 云端分片准备签名" />
        <Arrow />
        <Step n="C" title="API Co-Signer" detail="Enclave 在签之前问 callback" />
        <Arrow />
        <Step n="D" title="POST /v2/tx_sign_request" detail="JSON 或 JWT，含 requestId" accent />
      </div>
      <ArrowDown label="本服务用 live TAP 判定（第一条命中的规则）" />
      <div className="grid gap-3 md:grid-cols-3">
        <Outcome
          label="TAP ALLOW"
          result="{ action: APPROVE }"
          next="Co-Signer 签名 → 广播"
          tone="pass"
        />
        <Outcome
          label="TAP BLOCK"
          result="{ action: REJECT }"
          next="交易失败，不可挽回"
          tone="fail"
        />
        <Outcome
          label="TAP 2-TIER / 未命中"
          result="{ action: RETRY }"
          next="进队列或 Ops Bot，人审后再问同一 requestId"
          tone="hold"
        />
      </div>
    </div>
  );
}

function PolicyFlow() {
  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
      <Step n="1" title="改 TAP" detail="改 USD 上限、开关、加规则" />
      <Arrow />
      <Step n="2" title="POLICY_APPROVAL" detail="只写草稿，live 规则不变" />
      <Arrow />
      <Step n="3" title="队列 2-TIER" detail="callback 对配置变更回 RETRY" />
      <Arrow />
      <Step n="4" title="Approve & sign" detail="人签后写入 live TAP" accent />
    </div>
  );
}

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

function ArrowDown({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 py-1 text-center">
      <span className="text-teal-300/80" aria-hidden>
        ↓
      </span>
      <p className="max-w-xl text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Outcome({
  label,
  result,
  next,
  tone,
}: {
  label: string;
  result: string;
  next: string;
  tone: "pass" | "fail" | "hold";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        tone === "pass" && "border-teal-400/35 bg-teal-400/8",
        tone === "fail" && "border-red-400/35 bg-red-400/8",
        tone === "hold" && "border-amber-400/35 bg-amber-400/8",
      )}
    >
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-1 font-mono text-[11px] text-muted-foreground">{result}</p>
      <p className="mt-2 text-xs text-muted-foreground">{next}</p>
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
