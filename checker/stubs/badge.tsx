import * as React from "react";
type Props = React.ComponentProps<"span"> & {
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
};
export function Badge({ variant = "default", ...props }: Props) {
  return <span data-slot="badge" data-variant={variant} {...props} />;
}
