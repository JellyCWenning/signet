# Fireblocks Co-Sign

Operator desk for pairing a Fireblocks API bot to an [API Co-Signer](https://developers.fireblocks.com/docs/use-cosigners-for-signing-automation).

**Fireblocks workspace TAP is the only policy. Callback is off.** After TAP allows a transfer, the Co-Signer signs inside its enclave without posting this app.

**Usage manual:** [docs/MANUAL.md](docs/MANUAL.md) — RSA key, Signer API user, TAP edits, sending a transfer, and the full path.

## Full path

```mermaid
flowchart TD
  subgraph setup [One-time setup]
    A1[Generate RSA 4096 locally] --> A2[Create Signer API user + upload CSR]
    A2 --> A3[Pair API user to Co-Signer — no callback]
    A3 --> A4[Console TAP ALLOW + designated signer]
    A4 --> A5[Owner / Admin approve on mobile]
  end

  subgraph runtime [Each transfer]
    B1[Bot signs JWT with RSA private key] --> B2[POST /v1/transactions]
    B2 --> TAP{Fireblocks TAP}
    TAP -->|BLOCK| X1[Fail — never reaches Co-Signer]
    TAP -->|2-TIER| F2[Human in Console / mobile]
    TAP -->|ALLOW| C1[Cloud MPC share]
    C1 --> C2[Enclave share — callback off]
    C2 --> C3[Combine shares and broadcast]
  end

  setup --> runtime
```

In-app: `/flow`.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:43147](http://localhost:43147).

## Stack

Next.js, TypeScript, Tailwind, shadcn/ui. Queue state is in-memory for the Node process.
