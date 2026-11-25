import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-medium leading-[1.35] whitespace-nowrap [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-elevated text-muted",
        accent: "bg-accent-muted text-accent-soft",
        success: "bg-success/12 text-success",
        warning: "bg-warning/14 text-warning",
        danger: "bg-danger/12 text-danger",
        info: "bg-info/12 text-info",
        outline: "border border-line-strong text-muted",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
