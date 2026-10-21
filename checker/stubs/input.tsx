import * as React from "react";
export function Input(props: React.ComponentProps<"input">) {
  return <input data-slot="input" {...props} />;
}
