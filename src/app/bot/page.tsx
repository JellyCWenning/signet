"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useJson } from "@/hooks/use-json";
import { formatTimestamp } from "@/lib/format";
import type { BotConnection, BotMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function BotPage() {
  const { data, reload } = useJson<{ bot: BotConnection; messages: BotMessage[] }>(
    "/api/bot",
    2000,
  );
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(command?: string) {
    const payload = (command ?? text).trim();
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
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bot command failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(connected: boolean) {
    await fetch("/api/bot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ connected }),
    });
    await reload();
  }

  const bot = data?.bot;
  const messages = data?.messages ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Co-Signer"
        title="Ops bot"
        description="Pair a chat bot with the API Co-Signer. Matching TAP rules still auto-approve. Held transfers and policy edits are pinged here so an operator can /approve or /reject without opening the console."
      />

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>{bot?.name ?? "Ops bot"}</CardTitle>
            <CardDescription>
              {bot?.kind} · {bot?.chatId} · webhook POST /api/bot
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {bot?.status === "connected" ? "Connected" : "Disconnected"}
            </span>
            <Switch
              checked={bot?.status === "connected"}
              onCheckedChange={(checked) => void toggle(checked)}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-h-[420px] space-y-2 overflow-y-auto rounded-lg border border-border/80 bg-background/40 p-3">
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
          <p className="text-xs text-muted-foreground">
            Try a held request from the queue, then send <code>/approve</code> or{" "}
            <code>/reject</code> with its id.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
