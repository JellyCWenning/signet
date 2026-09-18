const token = process.env.AUTO_MARGIN_TOKEN?.trim();
if (!token) {
  throw new Error("AUTO_MARGIN_TOKEN is not configured");
}

const response = await fetch("http://127.0.0.1:43147/api/fireblocks/auto-margin", {
  method: "POST",
  headers: { authorization: `Bearer ${token}` },
  signal: AbortSignal.timeout(570_000),
});
const body = await response.text();
process.stdout.write(`${body}\n`);
if (!response.ok) process.exitCode = 1;
