"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SIMULATE_PRESETS } from "@/lib/seed";
import { cn } from "@/lib/utils";

export function SimulateDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [presetId, setPresetId] = useState(SIMULATE_PRESETS[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const response = await fetch("/api/simulate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ presetId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Simulate failed");
      const action = body.response?.action as string;
      toast.success(`Callback returned ${action}`, {
        description: body.request?.id,
      });
      setOpen(false);
      router.push(`/queue/${body.request.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Simulate failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        Simulate callback
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Simulate a Co-Signer callback</DialogTitle>
          <DialogDescription>
            Posts a Fireblocks-shaped payload to the callback handler so you can
            watch policy auto-sign, auto-reject, or hold for review.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {SIMULATE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setPresetId(preset.id)}
              className={cn(
                "rounded-lg border bg-card/60 p-3 text-left transition-colors",
                presetId === preset.id
                  ? "border-teal-400/40 bg-teal-400/8"
                  : "border-border/80 hover:bg-muted/40",
              )}
            >
              <span className="block text-sm font-medium">{preset.label}</span>
              <span className="block text-xs text-muted-foreground">
                {preset.description}
              </span>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={run} disabled={busy}>
            {busy ? "Posting…" : "Send to callback handler"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
