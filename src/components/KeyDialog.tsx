import { KeyRound, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Button, Dialog, Switch } from "@/components/ui";
import { maskKey, type Keys } from "@/lib/api";

export interface KeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keys: Keys;
  remember: boolean;
  serverHasAaKey: boolean;
  onSave: (keys: Keys, remember: boolean) => void;
}

export function KeyDialog({
  open,
  onOpenChange,
  keys,
  remember,
  serverHasAaKey,
  onSave,
}: KeyDialogProps) {
  const [draft, setDraft] = useState<Keys>(keys);
  const [rememberDraft, setRememberDraft] = useState(remember);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Connect your keys"
      description="SOM talks to OpenRouter for the model catalogue and to Artificial Analysis for benchmarks. Keys stay in this browser and are sent only to the endpoint you configured."
      width={560}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-[8px] border border-line bg-white/[0.02] p-2.5">
          <ShieldCheck className="mt-[1px] h-3.5 w-3.5 shrink-0 text-open" strokeWidth={1.4} />
          <p className="text-[11.5px] leading-relaxed text-fg-muted">
            Keys are never written to the repository, never included in exports, and never logged.
            With <span className="text-fg">remember</span> off they live in this tab&apos;s session
            only.
          </p>
        </div>

        <div>
          <label htmlFor="or-key" className="mb-1.5 flex items-center justify-between text-[11.5px] font-medium text-fg-muted">
            <span className="flex items-center gap-1.5">
              <KeyRound className="h-3 w-3" strokeWidth={1.5} /> OpenRouter API key
            </span>
            <span className="text-[10.5px] text-fg-dim">optional</span>
          </label>
          <input
            id="or-key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={draft.openrouter}
            onChange={(event) => setDraft({ ...draft, openrouter: event.target.value.trim() })}
            placeholder="sk-or-v1-…"
            className="numeric h-9 w-full rounded-[6px] border border-line bg-white/[0.03] px-2.5 text-[12px] text-fg placeholder:text-fg-dim focus:border-line-strong focus:outline-none"
          />
          <p className="mt-1 text-[10.5px] text-fg-dim">
            Adds your account credits and live provider stats. The catalogue itself is public.
          </p>
        </div>

        <div>
          <label htmlFor="aa-key" className="mb-1.5 flex items-center justify-between text-[11.5px] font-medium text-fg-muted">
            <span className="flex items-center gap-1.5">
              <KeyRound className="h-3 w-3" strokeWidth={1.5} /> Artificial Analysis API key
            </span>
            <span className="text-[10.5px] text-fg-dim">
              {serverHasAaKey ? "server key detected" : "optional"}
            </span>
          </label>
          <input
            id="aa-key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={draft.artificialAnalysis}
            onChange={(event) =>
              setDraft({ ...draft, artificialAnalysis: event.target.value.trim() })
            }
            placeholder="aa_…"
            className="numeric h-9 w-full rounded-[6px] border border-line bg-white/[0.03] px-2.5 text-[12px] text-fg placeholder:text-fg-dim focus:border-line-strong focus:outline-none"
          />
          <p className="mt-1 text-[10.5px] leading-relaxed text-fg-dim">
            Unlocks intelligence, coding, agentic and domain indices plus cache pricing. Artificial
            Analysis does not allow cross-origin calls, so the key is forwarded by your local SOM
            server and cached in memory only.
          </p>
        </div>

        <div className="rounded-[8px] border border-line bg-white/[0.02] p-2.5">
          <Switch
            id="remember"
            label="Remember this device"
            checked={rememberDraft}
            onCheckedChange={setRememberDraft}
          />
          <p className="mt-1.5 text-[10.5px] text-fg-dim">
            Off = session storage. On = persists across restarts, readable by any script on this
            origin. Only enable it on a machine you trust.
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
          <span className="numeric text-[10.5px] text-fg-dim">
            OR {maskKey(keys.openrouter)} · AA {maskKey(keys.artificialAnalysis)}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onSave(draft, rememberDraft);
                onOpenChange(false);
              }}
            >
              Save &amp; reload data
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
