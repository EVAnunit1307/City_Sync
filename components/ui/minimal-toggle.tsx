"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const MinimalToggle = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <label className="relative inline-block h-[1.25em] w-[2.4em] text-[17px]">
        <input
          type="checkbox"
          ref={ref}
          className={cn(
            "group h-0 w-0 opacity-0 absolute",
            "[&:checked+span:before]:translate-x-[1.15em]",
            "[&:checked+span:before]:bg-emerald-400",
            "dark:[&:checked+span:before]:bg-emerald-400",
            "[&:checked+span]:bg-emerald-600",
            "dark:[&:checked+span]:bg-emerald-700",
            className
          )}
          {...props}
        />
        <span className={cn(
          "absolute inset-0 cursor-pointer rounded-full bg-gray-600 transition ease-in-out",
          "before:absolute before:top-[0.15em] before:left-[0.15em] before:h-[0.95em] before:w-[0.95em]",
          "before:rounded-full before:bg-white/90 before:transition before:duration-300 before:content-['']",
          "dark:bg-gray-700 dark:before:bg-white/90"
        )} />
      </label>
    )
  }
)
MinimalToggle.displayName = "MinimalToggle"

const OrangeToggle = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        type="checkbox"
        ref={ref}
        className={cn(
          "ease before:ease relative h-6 w-12 appearance-none rounded-full bg-stone-300",
          "transition duration-300",
          "before:absolute before:left-[calc(1.5em_-_1.6em)] before:top-[calc(1.5em_-_1.6em)]",
          "before:block before:h-[1.7em] before:w-[1.6em] before:cursor-pointer",
          "before:rounded-full before:border before:border-solid before:border-stone-400",
          "before:bg-white before:transition-all before:duration-300 before:content-['']",
          "checked:bg-orange-600 checked:before:translate-x-full checked:before:border-orange-500",
          "hover:before:shadow-[0_0_0px_8px_rgba(0,0,0,0.15)]",
          "checked:hover:before:shadow-[0_0_0px_8px_rgba(236,72,72,0.15)]",
          className
        )}
        {...props}
      />
    )
  }
)
OrangeToggle.displayName = "OrangeToggle"

export { MinimalToggle, OrangeToggle }
