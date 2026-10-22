import * as AccordionPrimitive from "@radix-ui/react-collapsible";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as SliderPrimitive from "@radix-ui/react-slider";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  createContext,
  forwardRef,
  useContext,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ button */

type ButtonVariant = "primary" | "outline" | "ghost" | "subtle" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-ink hover:brightness-105 active:scale-[0.985] shadow-[0_1px_0_rgba(255,255,255,0.4)_inset,0_8px_24px_-12px_rgba(198,242,78,0.6)]",
  outline:
    "border border-line-strong bg-transparent text-fg hover:bg-white/[0.06] active:scale-[0.985]",
  ghost: "text-fg-muted hover:text-fg hover:bg-white/[0.06]",
  subtle: "bg-white/[0.055] text-fg hover:bg-white/[0.09] active:scale-[0.985]",
  danger: "bg-bad/15 text-bad hover:bg-bad/25 border border-bad/30",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-7 px-2.5 text-[12px] gap-1.5 rounded-[6px]",
  md: "h-9 px-3.5 text-[13px] gap-2 rounded-[8px]",
  lg: "h-11 px-5 text-[14px] gap-2 rounded-[10px]",
  icon: "h-8 w-8 rounded-[7px] justify-center",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "subtle", size = "md", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "inline-flex select-none items-center justify-center whitespace-nowrap font-medium",
        "transition-[background-color,color,transform,filter,box-shadow] duration-150 ease-[cubic-bezier(0.22,0.72,0.12,1)]",
        "disabled:pointer-events-none disabled:opacity-40",
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    />
  );
});

/* ------------------------------------------------------------------- chips */

export function Chip({
  children,
  active,
  count,
  disabled,
  dimmed,
  onClick,
  className,
  title,
}: {
  children: ReactNode;
  active?: boolean;
  count?: number;
  disabled?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={active}
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[5px] text-[12px] leading-none",
        "transition-[background-color,border-color,color,opacity] duration-150 ease-[cubic-bezier(0.22,0.72,0.12,1)]",
        active
          ? "border-accent/40 bg-accent/15 text-accent"
          : "border-line bg-white/[0.02] text-fg-muted hover:border-line-strong hover:text-fg",
        dimmed && !active && "opacity-40",
        disabled && "pointer-events-none opacity-30",
        className,
      )}
    >
      {children}
      {count !== undefined && (
        <span
          className={cn(
            "numeric text-[10px] tabular-nums",
            active ? "text-accent/80" : "text-fg-dim group-hover:text-fg-muted",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
  title,
}: {
  children: ReactNode;
  tone?: "neutral" | "open" | "closed" | "accent" | "warn" | "info";
  className?: string;
  title?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "border-line text-fg-muted",
    open: "border-open/35 text-open bg-open/10",
    closed: "border-line-strong text-fg-muted bg-white/[0.04]",
    accent: "border-accent/35 text-accent bg-accent/10",
    warn: "border-warn/40 text-warn bg-warn/10",
    info: "border-info/35 text-info bg-info/10",
  };
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-[4px] border px-1.5 py-[2px] text-[10px] font-medium uppercase tracking-[0.08em] leading-none",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ switch */

export function Switch({
  checked,
  onCheckedChange,
  label,
  id,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  label?: string;
  id?: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer select-none items-center justify-between gap-3 text-[13px] text-fg-muted hover:text-fg"
    >
      {label && <span>{label}</span>}
      <SwitchPrimitive.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className={cn(
          "relative h-[18px] w-[30px] shrink-0 rounded-full border transition-colors duration-200 ease-[cubic-bezier(0.22,0.72,0.12,1)]",
          checked ? "border-accent/50 bg-accent/85" : "border-line-strong bg-white/[0.07]",
        )}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            "block h-[12px] w-[12px] rounded-full transition-transform duration-200 ease-[cubic-bezier(0.22,0.72,0.12,1)]",
            checked ? "translate-x-[15px] bg-accent-ink" : "translate-x-[3px] bg-fg-muted",
          )}
        />
      </SwitchPrimitive.Root>
    </label>
  );
}

/* ------------------------------------------------------------------ slider */

export interface RangeProps {
  value: [number, number];
  min: number;
  max: number;
  step?: number;
  onValueChange: (value: [number, number]) => void;
  onValueCommit?: (value: [number, number]) => void;
  log?: boolean;
  ariaLabel?: [string, string];
}

function toLog(value: number, min: number, max: number) {
  const safeMin = Math.max(min, 1e-6);
  return (Math.log(Math.max(value, safeMin)) - Math.log(safeMin)) / (Math.log(max) - Math.log(safeMin));
}

function fromLog(position: number, min: number, max: number) {
  const safeMin = Math.max(min, 1e-6);
  return Math.exp(Math.log(safeMin) + position * (Math.log(max) - Math.log(safeMin)));
}

export function Range({ value, min, max, step = 1, onValueChange, onValueCommit, log, ariaLabel }: RangeProps) {
  const position: [number, number] = log
    ? [toLog(value[0], min, max) * 1000, toLog(value[1], min, max) * 1000]
    : [value[0], value[1]];
  const domainMax = log ? 1000 : max;
  const domainMin = log ? 0 : min;

  return (
    <SliderPrimitive.Root
      className="relative flex h-5 w-full touch-none select-none items-center"
      value={position}
      min={domainMin}
      max={domainMax}
      step={log ? 1 : step}
      onValueChange={(next) => {
        const mapped: [number, number] = log
          ? [
              Math.round(fromLog(next[0] / 1000, min, max) * 1000) / 1000,
              Math.round(fromLog(next[1] / 1000, min, max) * 1000) / 1000,
            ]
          : [next[0], next[1]];
        onValueChange(mapped);
      }}
      onValueCommit={(next) => {
        if (!onValueCommit) return;
        const mapped: [number, number] = log
          ? [
              Math.round(fromLog(next[0] / 1000, min, max) * 1000) / 1000,
              Math.round(fromLog(next[1] / 1000, min, max) * 1000) / 1000,
            ]
          : [next[0], next[1]];
        onValueCommit(mapped);
      }}
      aria-label={ariaLabel?.join(" to ")}
    >
      <SliderPrimitive.Track className="relative h-[3px] w-full grow overflow-hidden rounded-full bg-white/10">
        <SliderPrimitive.Range className="absolute h-full bg-accent/80" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-3.5 w-3.5 rounded-full border border-white/25 bg-fg shadow-[0_2px_8px_rgba(0,0,0,0.6)] transition-transform duration-150 hover:scale-110 focus-visible:scale-110" />
      <SliderPrimitive.Thumb className="block h-3.5 w-3.5 rounded-full border border-white/25 bg-fg shadow-[0_2px_8px_rgba(0,0,0,0.6)] transition-transform duration-150 hover:scale-110 focus-visible:scale-110" />
    </SliderPrimitive.Root>
  );
}

export function SingleRange({
  value,
  min,
  max,
  step = 1,
  onValueChange,
  log,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onValueChange: (value: number) => void;
  log?: boolean;
}) {
  const position = log ? toLog(value, min, max) * 1000 : value;
  return (
    <SliderPrimitive.Root
      className="relative flex h-5 w-full touch-none select-none items-center"
      value={[position]}
      min={log ? 0 : min}
      max={log ? 1000 : max}
      step={log ? 1 : step}
      onValueChange={([next]) => onValueChange(log ? Math.round(fromLog(next / 1000, min, max) * 1000) / 1000 : next)}
    >
      <SliderPrimitive.Track className="relative h-[3px] w-full grow overflow-hidden rounded-full bg-white/10">
        <SliderPrimitive.Range className="absolute h-full bg-accent/80" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-3.5 w-3.5 rounded-full border border-white/25 bg-fg shadow-[0_2px_8px_rgba(0,0,0,0.6)] transition-transform duration-150 hover:scale-110" />
    </SliderPrimitive.Root>
  );
}

/* ----------------------------------------------------------------- tooltip */

export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={180} skipDelayDuration={80}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

export function Tooltip({
  children,
  content,
  side = "top",
}: {
  children: ReactNode;
  content: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={8}
          collisionPadding={10}
          className="z-[70] max-w-[280px] rounded-[6px] border border-line-strong bg-elevated px-2.5 py-1.5 text-[12px] leading-snug text-fg shadow-[0_18px_40px_-20px_rgba(0,0,0,0.9)]"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

/* ------------------------------------------------------------------ dialog */

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  width = 520,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  width?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduce ? 0 : 0.18 }}
                className="fixed inset-0 z-[80] bg-black/65 backdrop-blur-[3px]"
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount>
              <motion.div
                initial={{ opacity: 0, y: reduce ? 0 : 14, scale: reduce ? 1 : 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: reduce ? 0 : 8, scale: reduce ? 1 : 0.99 }}
                transition={{ duration: reduce ? 0 : 0.22, ease: [0.22, 0.72, 0.12, 1] }}
                style={{ width }}
                className="bezel fixed left-1/2 top-1/2 z-[81] max-h-[88vh] w-[calc(100vw-2rem)] max-w-full -translate-x-1/2 -translate-y-1/2 overflow-hidden"
              >
                <div className="bezel-core max-h-[86vh] overflow-y-auto p-5">
                  <DialogPrimitive.Title className="text-[16px] font-medium tracking-[-0.02em] text-fg">
                    {title}
                  </DialogPrimitive.Title>
                  {description && (
                    <DialogPrimitive.Description className="mt-1 text-[12.5px] leading-relaxed text-fg-muted">
                      {description}
                    </DialogPrimitive.Description>
                  )}
                  <div className="mt-4">{children}</div>
                </div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}

/* ----------------------------------------------------------------- popover */

export function Popover({
  trigger,
  children,
  align = "end",
  width = 280,
  open,
  onOpenChange,
}: {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "center" | "end";
  width?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          sideOffset={8}
          collisionPadding={12}
          style={{ width }}
          className="z-[70] rounded-[10px] border border-line-strong bg-elevated/95 p-3 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.95)] backdrop-blur-xl"
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

/* -------------------------------------------------------------- accordion */

export function Section({
  title,
  hint,
  children,
  defaultOpen = true,
  right,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  right?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <AccordionPrimitive.Root open={open} onOpenChange={setOpen} className="border-b border-line/70">
      <div className="flex items-center justify-between gap-2 py-2">
        <AccordionPrimitive.Trigger className="group flex flex-1 items-center gap-1.5 text-left">
          <svg
            viewBox="0 0 12 12"
            className={cn(
              "h-2.5 w-2.5 shrink-0 text-fg-dim transition-transform duration-200 ease-[cubic-bezier(0.22,0.72,0.12,1)]",
              open && "rotate-90",
            )}
            aria-hidden
          >
            <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
          <span className="eyebrow group-hover:text-fg-muted">{title}</span>
        </AccordionPrimitive.Trigger>
        {right}
      </div>
      <AccordionPrimitive.Content className="overflow-hidden">
        <div className="pb-3.5 pt-0.5">{children}</div>
      </AccordionPrimitive.Content>
      {hint && open && <p className="sr-only">{hint}</p>}
    </AccordionPrimitive.Root>
  );
}

/* --------------------------------------------------------------- segmented */

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = "md",
  className,
}: {
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-line bg-white/[0.025] p-0.5",
        className,
      )}
      role="tablist"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            title={option.title}
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative rounded-full font-medium transition-colors duration-150",
              size === "sm" ? "px-2.5 py-[3px] text-[11px]" : "px-3 py-1 text-[12px]",
              active ? "text-accent-ink" : "text-fg-muted hover:text-fg",
            )}
          >
            {active && (
              <motion.span
                layoutId={`segmented-${options.map((o) => o.value).join("-")}`}
                transition={{ duration: reduce ? 0 : 0.24, ease: [0.22, 0.72, 0.12, 1] }}
                className="absolute inset-0 rounded-full bg-accent"
              />
            )}
            <span className="relative z-10">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------- misc */

export function Meter({ value, tone = "accent" }: { value: number; tone?: "accent" | "open" | "warn" }) {
  const colors = { accent: "bg-accent", open: "bg-open", warn: "bg-warn" };
  return (
    <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/10">
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(0.22,0.72,0.12,1)]", colors[tone])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="numeric rounded-[4px] border border-line-strong bg-white/[0.05] px-1.5 py-[1px] text-[10px] text-fg-muted">
      {children}
    </kbd>
  );
}

export function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <span className="text-[11.5px] font-medium text-fg-muted">{children}</span>
      {hint && <span className="numeric text-[10.5px] text-fg-dim">{hint}</span>}
    </div>
  );
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return <p className="text-[11.5px] leading-relaxed text-fg-dim">{children}</p>;
}

/* Simple motion-safe height wrapper used by the filter sections */
const StaggerContext = createContext(false);
export function StaggerProvider({ children, value }: { children: ReactNode; value: boolean }) {
  return <StaggerContext.Provider value={value}>{children}</StaggerContext.Provider>;
}
export function useStagger() {
  return useContext(StaggerContext);
}
