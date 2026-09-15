# Fireblocks Co-Sign

Operator desk, TAP engine, and callback handler for [Fireblocks API Co-Signers](https://developers.fireblocks.com/docs/use-cosigners-for-signing-automation).

The Co-Signer holds an MPC key share in an enclave and asks this service whether to participate in a signature. Transfers that match the Transaction Authorization Policy are auto-approved. Everything else — including TAP edits — waits for a human or the paired ops bot.

## What you can do

- Pair a Fireblocks API user (bot) to a Co-Signer and enable the callback handler
- Auto-approve Fireblocks wallet transfers that match TAP (amount ceiling, destination type, operation)
- Hold anything that does not match, then approve or reject from the queue or via `/approve` / `/reject` on the ops bot
- Edit thresholds and add TAP rules — those changes create a `POLICY_APPROVAL` request and only go live after human approval
- Simulate Co-Signer callbacks without Fireblocks credentials
- Read the audit log of callback retries, auto-signs, and operator decisions

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:43147](http://localhost:43147).

## Callback contract

Configure the Co-Signer callback URL as the origin of this app. Fireblocks appends the path ([docs](https://developers.fireblocks.com/docs/create-api-co-signer-callback-handler)):

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/v2/tx_sign_request` | Transaction signing and approval |
| `POST` | `/v2/config_change_sign_request` | Workspace configuration approvals |

Response body:

```json
{
  "action": "APPROVE",
  "requestId": "req_7f3c91a2",
  "rejectionReason": "optional, for REJECT"
}
```

`action` is one of `APPROVE`, `REJECT`, `RETRY`, or `IGNORE`. `IGNORE` is valid for approvals only, not signing. Held requests return `RETRY` until an operator or the ops bot decides.

Production handlers should verify the Co-Signer JWT and sign the response with RS256. This demo accepts JSON (and unsigned JWTs) so you can run it without secrets.

Example:

```bash
curl -s http://localhost:43147/v2/tx_sign_request \
  -H 'content-type: application/json' \
  -d '{
    "requestId": "req_demo_1",
    "txId": "fb_tx_demo",
    "operation": "TRANSFER",
    "assetId": "ETH",
    "amountStr": "2.0",
    "amountUSD": 6600,
    "sourceType": "VAULT",
    "sourceId": "0",
    "destType": "VAULT",
    "destId": "12",
    "dstAddressType": "WHITELISTED",
    "signerId": "api_signer_treasury"
  }'
```

That payload matches the internal-vault auto-sign rule and should return `"action":"APPROVE"`.

## Stack

Next.js, TypeScript, Tailwind, shadcn/ui. Queue state is in-memory for the Node process — reset it from Settings, and expect it to reseed on a cold start.
