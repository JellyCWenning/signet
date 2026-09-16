export const TAP_CONSOLE_PUBLIC_URL = "http://13.196.167.126/";

export const FIREBLOCKS_API_USER_ID = "c49cc13a-b267-48eb-876c-37e4bc1eb07a";

export const NITRO_PCR8 =
  "da1d9eca20ce98ab4fdbc51f8e5a2307fd4c61829b7d8bff40976cd6676862c8f3476ff4bdd0f65ecf4a48d6eb3099a8";

export interface OpsMachine {
  id: string;
  role: string;
  where: string;
  stores: string;
  neverStores: string;
  instance?: string;
  publicHint?: string;
  iam?: string;
}

export const OPS_ROLES: OpsMachine[] = [
  {
    id: "tap-console",
    role: "TAP Console / bot web",
    where: "Tokyo · ap-northeast-1d · t3.small",
    stores: "Venue TAP (margin trigger / max transfer) and Fireblocks API JWT (API key + RSA)",
    neverStores: "No MPC shares",
    instance: "i-029023e02658d5cb2 · Co-sign-frountend-service",
    publicHint: TAP_CONSOLE_PUBLIC_URL,
    iam: "tap-console (SSM only — no S3 / KMS)",
  },
  {
    id: "co-signer",
    role: "API Co-Signer",
    where: "N. Virginia · us-east-1a · c5.xlarge Nitro",
    stores: "Customer MPC share (enclave; ciphertext in S3 + KMS PCR8)",
    neverStores: "No frontend, no RSA bot key",
    instance: "i-0726e50457f1cf8b2",
    publicHint: "13.219.234.43 — do not open SSH 22; use SSM",
    iam: "fireblocks-nitro-cosigner",
  },
  {
    id: "fireblocks",
    role: "Fireblocks SaaS",
    where: "Global workspace",
    stores: "Cloud MPC share + Console TAP (ALLOW / BLOCK / 2-TIER)",
    neverStores: "Does not host this desk or the Nitro enclave",
  },
];

export type OpsStepStatus = "done" | "operator" | "later";

export interface OpsStep {
  id: string;
  status: OpsStepStatus;
  title: string;
  detail: string;
}

export const OPS_STEPS: OpsStep[] = [
  {
    id: "mpc-share",
    status: "operator",
    title: "Owner approves the MPC key-share in the Fireblocks mobile app",
    detail:
      "Must happen within 120 hours of pairing. Without this, ALLOW transfers cannot auto-sign.",
  },
  {
    id: "cosigner-online",
    status: "operator",
    title: "Confirm Co-signers tab is Online",
    detail: `Developer Center → Co-signers. API user ${FIREBLOCKS_API_USER_ID} should be paired. Callback stays empty.`,
  },
  {
    id: "console-tap",
    status: "operator",
    title: "Configure Fireblocks Console TAP",
    detail:
      "ALLOW with designated signer (this API user), vaults, destinations, amounts. This is workspace TAP, not venue TAP on this desk.",
  },
  {
    id: "paste-jwt",
    status: "operator",
    title: "Paste API key UUID + RSA PEM on /policy and Ping",
    detail:
      "In-memory only until process restart. Persist on the Tokyo host as /opt/tap-console/.env.local (never commit).",
  },
  {
    id: "allow-test",
    status: "operator",
    title: "Small ALLOW transfer test",
    detail:
      "Tokyo desk or bot submits a transfer. Mobile should not be required unless TAP is 2-TIER.",
  },
  {
    id: "rotate-keys",
    status: "operator",
    title: "Rotate keys that appeared in chat",
    detail:
      "Delete IAM user cursor-temp-cosigner access keys. Revoke any GitHub PAT used to push this repo. Do not put those values in git.",
  },
  {
    id: "https",
    status: "later",
    title: "HTTPS for Tokyo TAP",
    detail: "Currently HTTP on nginx:80. Add ACM / ALB or an nginx certificate when ready.",
  },
];

export const OPS_NEVER = [
  "Do not attach the fireblocks-nitro-cosigner role to the Tokyo TAP instance.",
  "Do not enable Nitro on the TAP Console host.",
  "Do not add your own IAM Allow on the Co-Signer S3 bucket to “fix” Console Access Denied.",
  "Do not commit FIREBLOCKS_API_KEY, FIREBLOCKS_SECRET_KEY, or fireblocks_secret.key.",
];

export const COSIGNER_S3 = "fireblocks-nitro-cosigner-321953280180";
export const COSIGNER_KMS_ALIAS = "alias/fireblocks-nitro-cosigner";
export const COSIGNER_KMS_ARN =
  "arn:aws:kms:us-east-1:321953280180:key/cd6f92a3-0245-4361-99e4-3e2657553f3f";
export const AWS_ACCOUNT = "321953280180";
export const FIREBLOCKS_WORKSPACE = "Fireblocks Global · Bluering Trading · console.fireblocks.io";
