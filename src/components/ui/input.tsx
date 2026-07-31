import { Input as InputPrimitive } from "@base-ui/react/input";
import * as React from "react";

import { cn } from "@/lib/utils";

interface InputProps extends React.ComponentProps<"input"> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, leftIcon, rightIcon, ...props }, ref) => {
    return (
      <div
        className={cn(
          "relative flex items-center h-10 w-full min-w-0 rounded-lg border border-input bg-transparent text-base transition-colors outline-none focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30",
          className,
        )}
      >
        {leftIcon && (
          <div className="absolute left-3 flex items-center justify-center text-muted-foreground pointer-events-none *:size-4">
            {leftIcon}
          </div>
        )}
        <InputPrimitive
          ref={ref}
          type={type}
          data-slot="input"
          className={cn(
            "w-full h-full min-w-0 bg-transparent py-1 text-base outline-none placeholder:text-muted-foreground file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground md:text-sm disabled:cursor-not-allowed",
            leftIcon ? "pl-9" : "pl-2.5",
            rightIcon ? "pr-9" : "pr-2.5",
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 flex items-center justify-center text-muted-foreground pointer-events-none *:size-4">
            {rightIcon}
          </div>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export { Input };
export type { InputProps };
