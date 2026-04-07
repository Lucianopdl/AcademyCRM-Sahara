import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "default", ...props }, ref) => {
    const variants = {
      primary: "btn-primary",
      secondary: "bg-secondary text-on-secondary hover:bg-secondary/90 shadow-warm py-2 px-6 rounded-md",
      ghost: "hover:bg-primary/10 text-primary py-2 px-6 rounded-md",
      outline: "border-2 border-primary/20 text-primary hover:bg-primary/5 py-2 px-6 rounded-md"
    };

    const sizes = {
      default: "h-11",
      sm: "h-9 px-3 text-xs",
      lg: "h-12 px-8 text-lg",
      icon: "h-10 w-10 p-2 flex items-center justify-center",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          size !== "icon" && sizes[size],
          size === "icon" && sizes.icon,
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
