# Ops runbook — TAP Console vs Nitro Co-Signer

Do not mix these machines. This desk is the Tokyo TAP Console. The Co-Signer is a separate Nitro host in N. Virginia.

Workspace: Fireblocks Global · Bluering Trading · console.fireblocks.io
AWS account: `321953280180`

TAP UI: http://13.196.167.126/ (Tokyo t3.small `i-029023e02658d5cb2`)
Co-Signer: us-east-1 `i-0726e50457f1cf8b2` Nitro, paired to API user `c49cc13a-b267-48eb-876c-37e4bc1eb07a`, callback off
Blocker: workspace Owner must approve the MPC key-share in the Fireblocks mobile app within 120 hours, then confirm Co-signers tab is Online

In-app `/ops` and `/policy` were removed. This HTTP desk does not accept RSA and does not edit Fireblocks TAP.

---

## Roles (keep separate)

| Role | Where | Stores | Never stores |
| --- | --- | --- | --- |
| TAP Console / bot web | Tokyo t3.small | Web, venue TAP (margin trigger / max transfer). JWT only from host `.env.local` | No MPC shares, no RSA paste UI |
| API Co-Signer | Virginia c5.xlarge Nitro | Customer MPC share (enclave; ciphertext in S3 + KMS PCR8) | No frontend, no RSA bot key |
| Fireblocks SaaS | Global | Cloud MPC share + Console TAP (ALLOW / BLOCK / 2-TIER) | — |

Callback is **off**. Transfers that Fireblocks TAP ALLOWs are auto-signed by the Co-Signer. The Owner still has to approve the **first** MPC key-share on the mobile app.

Path:

Venue TAP (Tokyo web) → bot JWT → Fireblocks TAP

- **BLOCK** → fail, never reaches Co-Signer
- **2-TIER** → human in Console / mobile
- **ALLOW** → Fireblocks cloud share + Virginia Nitro share → broadcast

---

## Machine A — TAP web (Tokyo)

| | |
| --- | --- |
| Region | `ap-northeast-1` (Tokyo) `ap-northeast-1d` |
| Instance | `i-029023e02658d5cb2` · t3.small · Co-sign-frountend-service |
| Public | http://13.196.167.126/ (nginx:80 → Next.js:43147) |
| IAM | `tap-console` (SSM only — no S3 / KMS on purpose) |
| Security group | `sg-02aed6cc899f6795d`: 22, 80 |
| Code | `/opt/tap-console` (clone of this repo) |
| Process | `systemctl status tap-console nginx` |

Fireblocks API key / RSA are **not** in git and **not** pasted into the HTTP UI. Persist on the host only:

```
/opt/tap-console/.env.local
FIREBLOCKS_API_KEY=
FIREBLOCKS_SECRET_KEY=
```

Never commit that file. The browser never sees the PEM.

Tokyo TAP is HTTP only. HTTPS later via ACM / ALB or an nginx certificate.

`tap-console.service` loads `/opt/tap-console/.env.local` if that file exists (`EnvironmentFile=-/opt/tap-console/.env.local`). Next.js also reads it from the working directory.

### SSH / deploy

```bash
ssh -i "$TOKYO_KEY" ec2-user@13.196.167.126
systemctl status tap-console nginx
cd /opt/tap-console
git fetch origin cursor/ops-handover-ba95
git checkout -B cursor/ops-handover-ba95 FETCH_HEAD
npm ci && npm run build && sudo systemctl restart tap-console
```

After merge to `main`, switch the host back:

```bash
cd /opt/tap-console && git fetch origin && git checkout main && git pull && npm ci && npm run build && sudo systemctl restart tap-console
```

---

## Machine B — Co-Signer (N. Virginia)

| | |
| --- | --- |
| Region | `us-east-1` · `us-east-1a` |
| Instance | `i-0726e50457f1cf8b2` · c5.xlarge Amazon Linux 2023 |
| Public | `13.219.234.43` — **do not open 22**; use SSM |
| Nitro | Enable · IMDS V2 only · hop 2 |
| Service | `cosigner` active, enclave RUNNING |
| Pairing | JWT ok · `PAIR_VIRTUAL_DEVICE` 204 · Loaded 1 devices · Callback empty |
| API user | `c49cc13a-b267-48eb-876c-37e4bc1eb07a` |
| IAM | `fireblocks-nitro-cosigner` + instance profile of the same name |
| S3 | `fireblocks-nitro-cosigner-321953280180` (encrypted DB) |
| KMS | `arn:aws:kms:us-east-1:321953280180:key/cd6f92a3-0245-4361-99e4-3e2657553f3f` · alias `fireblocks-nitro-cosigner` · Global PCR8 |

PCR8 (must match Global):

```
da1d9eca20ce98ab4fdbc51f8e5a2307fd4c61829b7d8bff40976cd6676862c8f3476ff4bdd0f65ecf4a48d6eb3099a8
```

Logs: `/var/log/customer_cosigner.log`

```bash
aws ssm start-session --region us-east-1 --target i-0726e50457f1cf8b2
systemctl status cosigner
nitro-cli describe-enclaves
tail -f /var/log/customer_cosigner.log
```

**Do not change the Co-Signer S3 bucket policy.** Console Access Denied on that bucket is correct: the policy Denies `*`, and only role `fireblocks-nitro-cosigner` may use it. It holds the encrypted shard DB. Tokyo `tap-console` has no S3 permission; that is also correct.

---

## Operator sequence (after pairing)

1. Owner approves the MPC key-share in the Fireblocks mobile app (120 hours). Without this, auto-sign cannot start.
2. Console: Developer Center → Co-signers → Online, API user paired.
3. Fireblocks Console TAP: ALLOW + designated signer (workspace TAP, not Tokyo venue TAP).
4. JWT already on Tokyo in `/opt/tap-console/.env.local`. Do not paste RSA into the website.
5. Small ALLOW transfer from Tokyo `/` or a bot. Mobile should not be required unless TAP is 2-TIER.
6. Rotate keys that appeared in chat: delete IAM user `cursor-temp-cosigner` access keys; revoke any GitHub PAT used to push this repo. Do not commit those values.
7. HTTPS for Tokyo TAP when you are ready (ACM / ALB or nginx cert).

---

## Never

- Attach role `fireblocks-nitro-cosigner` to the Tokyo TAP instance.
- Enable Nitro on the TAP Console host.
- Add your own IAM Allow on the Co-Signer S3 bucket to “fix” Access Denied.
- Commit `FIREBLOCKS_API_KEY`, `FIREBLOCKS_SECRET_KEY`, or `fireblocks_secret.key`.
- Paste RSA or edit Fireblocks TAP through the Tokyo HTTP site.
