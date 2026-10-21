import * as React from "react";
type Div = React.ComponentProps<"div">;
export function Card({ size = "default", ...p }: Div & { size?: "default" | "sm" }) {
  return <div data-slot="card" data-size={size} {...p} />;
}
export const CardHeader = (p: Div) => <div data-slot="card-header" {...p} />;
export const CardTitle = (p: Div) => <div data-slot="card-title" {...p} />;
export const CardDescription = (p: Div) => <div data-slot="card-description" {...p} />;
export const CardAction = (p: Div) => <div data-slot="card-action" {...p} />;
export const CardContent = (p: Div) => <div data-slot="card-content" {...p} />;
export const CardFooter = (p: Div) => <div data-slot="card-footer" {...p} />;
