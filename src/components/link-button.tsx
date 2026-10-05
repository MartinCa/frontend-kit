import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";

type LinkButtonProps = Omit<ComponentProps<typeof Button>, "nativeButton">;

/**
 * A `Button` that renders as a link: pass the router link (or a plain `<a>`) through `render`,
 * e.g. `<LinkButton render={<Link to="/library" />}>Back to Library</LinkButton>`.
 *
 * Base UI's `Button` assumes a native `<button>` and warns when `render` swaps in an `<a>` unless
 * `nativeButton={false}` is set. This wrapper bakes that flag in so every call site gets a real
 * `<a href>` (middle-click, Ctrl/Cmd-click, "Open in new tab", URL preview) without remembering it.
 * Navigation must never be an `onClick` + `navigate()` on a button — see DESIGN.md section 6.
 */
export function LinkButton(props: LinkButtonProps) {
  return <Button nativeButton={false} {...props} />;
}
