"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useJson } from "@/hooks/use-json";
import { enclaveLabel, formatTimestamp } from "@/lib/format";
import type {
  ApiUser,
  BotConnection,
  BotMessage,
  Cosigner,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { HealthDot } from "@/components/status-badge";

export function BotView({
  initialWorkspace,
  initialChat,
}: {
  initialWorkspace: { apiUsers: ApiUser[]; cosigners: Cosigner[] };
  initialChat: { bot: BotConnection; messages: BotMessage[] };
}) {
  const workspace = useJson("/api/workspace", 2500, initialWorkspace);
  const chat = useJson("/api/bot", 2000, initialChat);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function pair(userId: string, cosignerId: string | null, callbackEnabled?: boolean) {
    const response = await fetch("/api/workspace", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "pair", userId, cosignerId, callbackEnabled }),
    });
    const body = await response.json();
    if (!response.ok) {
      toast.error(body.error ?? "Unable to pair bot");
      return;
    }
    toast.success(cosignerId ? "API bot paired to Co-Signer" : "API bot unpaired");
    await workspace.reload();
  }

  async function send() {
    const payload = text.trim();
    if (!payload) return;
    setBusy(true);
    try {
      const response = await fetch("/api/bot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: payload }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Bot command failed");
      setText("");
      await chat.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bot command failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleChat(connected: boolean) {
    await fetch("/api/bot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ connected }),
    });
    await chat.reload();
  }

  const bot = chat.data?.bot;
  const messages = chat.data?.messages ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="API Co-Signer"
        title="Bots"
        description="Pair a Fireblocks API user (bot) to a Co-Signer and turn on the callback handler. Matching TAP rules are auto-approved. Held transfers can also be decided from the ops chat bot."
      />

      <Card>
        <CardHeader>
          <CardTitle>Fireblocks API bots</CardTitle>
          <CardDescription>
            The Co-Signer only auto-signs for a paired Signer bot with callback enabled. Callback
            URL is this app origin; Fireblocks appends /v2/tx_sign_request.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(workspace.data?.apiUsers ?? []).map((user) => (
            <div
              key={user.id}
              className="grid gap-3 rounded-lg border border-border/80 p-3 lg:grid-cols-[1.2fr_1fr_auto] lg:items-center"
            >
              <div>
                <p className="font-medium">{user.displayName}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {user.id} · {user.role}
                </p>
              </div>
              <Select
                value={user.pairedCosignerId ?? "none"}
                onValueChange={(value) =>
                  void pair(user.id, value === "none" ? null : String(value))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not paired</SelectItem>
                  {(workspace.data?.cosigners ?? []).map((cosigner) => (
                    <SelectItem key={cosigner.id} value={cosigner.id}>
                      {cosigner.name} · {enclaveLabel(cosigner.enclave)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
                Callback
                <Switch
                  checked={user.callbackEnabled}
                  disabled={!user.pairedCosignerId}
                  onCheckedChange={(checked) =>
                    void pair(user.id, user.pairedCosignerId, checked)
                  }
                />
              </label>
            </div>
          ))}
          <div className="grid gap-3 md:grid-cols-3">
            {(workspace.data?.cosigners ?? []).map((cosigner) => (
              <div key={cosigner.id} className="rounded-lg border border-border/80 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{cosigner.name}</p>
                  <HealthDot status={cosigner.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {enclaveLabel(cosigner.enclave)} · {cosigner.region}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {cosigner.pairedApiUser || "no bot paired"}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>{bot?.name ?? "Ops chat bot"}</CardTitle>
            <CardDescription>
              Telegram-style command channel for held TAP matches. POST /api/bot
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {bot?.status === "connected" ? "Connected" : "Disconnected"}
            </span>
            <Switch
              checked={bot?.status === "connected"}
              onCheckedChange={(checked) => void toggleChat(checked)}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-h-[360px] space-y-2 overflow-y-auto rounded-lg border border-border/80 bg-background/40 p-3">
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bot traffic yet.</p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[90%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                    message.direction === "out"
                      ? "bg-teal-400/10 text-foreground"
                      : "ml-auto bg-muted",
                  )}
                >
                  <p className="text-[10px] text-muted-foreground">
                    {message.direction === "out" ? "bot" : "operator"} ·{" "}
                    {formatTimestamp(message.at)}
                  </p>
                  {message.text}
                </div>
              ))
            )}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <Input
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="/approve req_7f3c91a2"
            />
            <Button type="submit" disabled={busy}>
              Send
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
