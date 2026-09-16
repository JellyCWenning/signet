"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FireblocksStatus } from "@/lib/fireblocks-types";

const BASE_URLS = [
  "https://api.fireblocks.io",
  "https://api.eu.fireblocks.io",
  "https://sandbox-api.fireblocks.io",
];

export function FireblocksCredentialsCard({
  status,
  onChange,
}: {
  status: FireblocksStatus | null;
  onChange: (status: FireblocksStatus) => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(status?.baseUrl || BASE_URLS[0]);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const response = await fetch("/api/fireblocks/credentials", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ apiKey, privateKey, baseUrl }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to store credentials");
      onChange(body as FireblocksStatus);
      setPrivateKey("");
      setApiKey("");
      toast.success("Fireblocks credentials stored in this process only");
      const pingResponse = await fetch("/api/fireblocks/credentials", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "ping" }),
      });
      const pingBody = await pingResponse.json();
      if (!pingResponse.ok) throw new Error(pingBody.error ?? "Stored, but ping failed");
      toast.success("Fireblocks API connected");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Unable to store credentials");
    } finally {
      setBusy(false);
    }
  }

  async function ping() {
    setBusy(true);
    try {
      const response = await fetch("/api/fireblocks/credentials", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "ping" }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Ping failed");
      toast.success("Fireblocks API connected", {
        description: body.ping ? String(body.ping) : undefined,
      });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Ping failed");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      const response = await fetch("/api/fireblocks/credentials", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clear: true }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to disconnect");
      onChange(body as FireblocksStatus);
      toast.success("Fireblocks credentials cleared from memory");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Unable to disconnect");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fireblocks API</CardTitle>
        <CardDescription>
          Paste the API key UUID and RSA private key. Every Fireblocks call is an RS256 JWT. Keys
          stay in this Node process — they are never written to disk.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm">
          {status?.configured ? (
            <span className="text-teal-200">
              Connected · key …{status.apiKeyLast4} · {status.baseUrl}
              {status.fromEnv ? " · from env" : ""}
            </span>
          ) : (
            <span className="text-muted-foreground">Not connected. Buttons below call Fireblocks.</span>
          )}
        </p>
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">API key UUID</span>
          <Input
            autoComplete="off"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">RSA private key PEM</span>
          <Textarea
            className="min-h-28 font-mono text-xs"
            autoComplete="off"
            placeholder="-----BEGIN PRIVATE KEY-----"
            value={privateKey}
            onChange={(event) => setPrivateKey(event.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">API base URL</span>
          <select
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
          >
            {BASE_URLS.map((url) => (
              <option key={url} value={url}>
                {url}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={busy} onClick={() => void save()}>
            {busy ? "Working…" : "Save & connect"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy || !status?.configured}
            onClick={() => void ping()}
          >
            Ping API
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy || !status?.configured}
            onClick={() => void disconnect()}
          >
            Disconnect
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
