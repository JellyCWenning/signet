# Fireblocks Co-Sign

Operator desk and callback handler for [Fireblocks API Co-Signers](https://developers.fireblocks.com/docs/use-cosigners-for-signing-automation).

The Co-Signer holds an MPC key share in an enclave (AWS Nitro, Intel SGX, or GCP Confidential Space) and asks this service whether to participate in a signature. This repo is a working slice of that loop: a Fireblocks-shaped callback API, a TAP-style policy engine, and a console for held requests.

## What you can do

- Inspect the live signing queue (seeded Northstar treasury traffic)
- Approve, reject, or ignore a held request — the next callback for that `requestId` returns `APPROVE` / `REJECT` / `IGNORE`
- Simulate Co-Signer callbacks (internal refill, large CEX withdrawal, one-time address, Uniswap call, policy change)
- Toggle policy rules and watch auto-sign vs hold behavior change
- Read the audit log of callback retries and operator decisions

No Fireblocks credentials are required. The workspace runs in JSON demo mode.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:43147](http://localhost:43147).

## Callback contract

Point an API Co-Signer callback URL at this app. Fireblocks appends the path:

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

`action` is one of `APPROVE`, `REJECT`, `RETRY`, or `IGNORE`. `IGNORE` is valid for approvals only, not signing. Held requests return `RETRY` until an operator decides.

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
