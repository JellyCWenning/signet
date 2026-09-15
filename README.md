# Fireblocks Co-Sign

Callback handler and operator desk for [Fireblocks API Co-Signers](https://developers.fireblocks.com/docs/use-cosigners-for-signing-automation).

**Fireblocks workspace TAP is the only policy.** Bot-created transfers already passed it. This service does not run a second TAP. The callback returns `APPROVE` so the Co-Signer can finish the signature.

## Architecture

```mermaid
sequenceDiagram
  participant Bot as API Bot
  participant TAP as Fireblocks TAP
  participant FB as Fireblocks 云
  participant CS as API Co-Signer
  participant CB as Callback（可选）

  Bot->>TAP: 发出信号（创建转账）
  TAP-->>Bot: BLOCK 则到不了 Co-Signer
  TAP->>FB: ALLOW 后进入签名
  FB->>CS: 请 enclave 分片参与 MPC
  alt callback 打开
    CS->>CB: POST /v2/tx_sign_request
    CB-->>CS: APPROVE（透传）
  end
  CS->>FB: 用分片签名
  FB-->>Bot: 合成签名并广播 · sign 完成
```

Open the in-app diagram at `/flow`.

## What you can do

- Pair a Fireblocks API user (bot) to a Co-Signer
- Optional callback that always returns APPROVE (audit + observability)
- Simulate Co-Signer callbacks without Fireblocks credentials
- Read the audit log of pass-through approvals

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:43147](http://localhost:43147).

## Callback contract

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/v2/tx_sign_request` | Transaction signing. Always `APPROVE`. |
| `POST` | `/v2/config_change_sign_request` | Config signing. Same pass-through `APPROVE`. |

Response body:

```json
{
  "action": "APPROVE",
  "requestId": "req_7f3c91a2"
}
```

Production handlers should verify the Co-Signer JWT and sign the response with RS256. This demo accepts JSON so you can run it without secrets.

## Stack

Next.js, TypeScript, Tailwind, shadcn/ui. Queue state is in-memory for the Node process — reset it from Settings, and expect it to reseed on a cold start.
