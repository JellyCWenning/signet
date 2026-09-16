# TAP Console

Live venue TAP for Albert Hyperliquid and Albert Lighter, plus a working **Fireblocks API desk**. No demo history, no fake Co-Signer fleet.

Paste a Fireblocks API key UUID and RSA private key on `/policy` (or set env vars). The server signs JWTs and calls TAP, vaults, and `POST /v1/transactions`.

**Manual:** [docs/MANUAL.md](docs/MANUAL.md)

## Full path

```mermaid
flowchart TD
  subgraph setup [One-time setup]
    A1[Generate RSA 4096 locally] --> A2[Create Signer API user + upload CSR]
    A2 --> A3[Pair API user to Co-Signer — no callback]
    A3 --> A4[Fireblocks TAP ALLOW + designated signer]
    A4 --> A5[Owner / Admin approve on mobile]
  end

  subgraph runtime [Each transfer]
    B0[Venue TAP Console: margin + max transfer] --> B1[Bot or this desk signs JWT]
    B1 --> B2[POST /v1/transactions]
    B2 --> TAP{Fireblocks TAP}
    TAP -->|BLOCK| X1[Fail — never reaches Co-Signer]
    TAP -->|2-TIER| F2[Human in Console / mobile]
    TAP -->|ALLOW| C1[Cloud MPC share]
    C1 --> C2[Enclave share — callback off]
    C2 --> C3[Combine shares and broadcast]
  end

  setup --> runtime
```

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:43147](http://localhost:43147).

Optional env (never commit secrets):

```
FIREBLOCKS_API_KEY=
FIREBLOCKS_SECRET_KEY=
FIREBLOCKS_API_BASE=https://api.fireblocks.io
```

## Stack

Next.js, TypeScript, Tailwind, shadcn/ui. Venue TAP and Fireblocks credentials are in-memory for the Node process.
