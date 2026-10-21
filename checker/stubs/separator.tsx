import * as React from "react";
export function Separator({ orientation = "horizontal", decorative = true, ...p }: React.ComponentProps<"div"> & { orientation?: "horizontal" | "vertical"; decorative?: boolean }) {
  return <div data-slot="separator" data-orientation={orientation} role={decorative ? "none" : "separator"} {...p} />;
}
