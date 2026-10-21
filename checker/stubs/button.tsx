import * as React from "react";
type Props = React.ComponentProps<"button"> & {
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
};
export function Button({ variant = "default", size = "default", type = "button", ...props }: Props) {
  return <button data-slot="button" data-variant={variant} data-size={size} type={type} {...props} />;
}
