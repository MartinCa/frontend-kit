import type { ComponentProps, ElementType, ReactNode } from "react";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ActionStatus } from "@/hooks/use-async-action";
import { cn } from "@/lib/utils";

type ActionButtonBaseProps = Omit<ComponentProps<typeof Button>, "children"> & {
  /** The button's resting icon (a lucide icon component). It stays visible after the action, tinted by the result. */
  icon: ElementType<{ className?: string; "aria-hidden"?: boolean }>;
  status?: ActionStatus;
  /** Replaces `label` in the accessible name and tooltip after a result, e.g. "Sent to qBittorrent". */
  resultLabel?: string;
};

type ActionButtonProps = ActionButtonBaseProps &
  (
    | {
        /** Icon-only: what the button does, as a verb phrase ("Send to download client"). Becomes the accessible name and tooltip. */
        label: string;
        children?: undefined;
      }
    | {
        /** Visible text next to the icon ("Ignore"). It is the accessible name, so `label` is optional. */
        children: ReactNode;
        /** Optional tooltip; after a result, `resultLabel` replaces it. Never sets the accessible name (the visible text does). */
        label?: string;
      }
  );

const statusTint: Record<ActionStatus, string | undefined> = {
  idle: undefined,
  pending: undefined,
  success: "text-status-ok",
  error: "text-status-error",
};

/**
 * Icon button (or icon + text button, when `children` is given) for an action whose outcome matters: idle shows the icon, pending swaps in a
 * spinner (same size, no layout shift), and a result tints the icon green or red until the next
 * click or until the button unmounts. In text mode the visible text is the accessible name and the
 * icon carries the spinner/tint. Put the result *text* in a toast (`notifications`), not
 * next to the button. Colour is not the only signal: `resultLabel` updates the accessible name
 * and tooltip, and `data-status` is exposed for styling and tests.
 */
export function ActionButton({
  icon: Icon,
  label,
  children,
  status = "idle",
  resultLabel,
  disabled,
  className,
  variant = "outline",
  size,
  ...props
}: ActionButtonProps) {
  const pending = status === "pending";
  const hasText = children !== undefined && children !== null && children !== false;
  const name = (status === "success" || status === "error") && resultLabel ? resultLabel : label;

  return (
    <Button
      variant={variant}
      size={size ?? (hasText ? "sm" : "icon-sm")}
      // Text mode: the visible text names the button (label-in-name), so only icon-only sets aria-label.
      aria-label={hasText ? undefined : name}
      title={name}
      aria-busy={pending}
      data-status={status}
      disabled={disabled || pending}
      className={cn(className)}
      {...props}
    >
      {pending ? (
        <Loader2Icon className="animate-spin" aria-hidden />
      ) : (
        <Icon className={statusTint[status]} aria-hidden />
      )}
      {hasText ? children : null}
    </Button>
  );
}
