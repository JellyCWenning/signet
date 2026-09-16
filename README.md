# Fireblocks Co-Sign

Operator desk for a Fireblocks Signer bot plus venue trigger TAP.

**Callback is off.** Fireblocks workspace TAP still gates signing. **TAP Console** (`/console`) sets account-margin and max-single-transfer triggers for Hyperliquid, Lighter, and MEXC.

**Usage manual:** [docs/MANUAL.md](docs/MANUAL.md)

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
    B0[Venue TAP Console: margin + max transfer] --> B1[Bot signs JWT with RSA private key]
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

Open [http://localhost:43147/console](http://localhost:43147/console).

## Stack

Next.js, TypeScript, Tailwind, shadcn/ui. Queue and venue TAP state are in-memory for the Node process.
