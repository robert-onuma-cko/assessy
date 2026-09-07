import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// The five SEMANTIC variants below are the state carrier of design.md §3.2 —
// the one primitive every lifecycle state in the app renders through, so
// "approved, green" can be asked of `Badge` instead of hand-rolled beside it
// (which is how the hardcoded-palette drift §11 records as closed gets back in).
//
// Each pairs the §3.2 foreground token with its own `-subtle` tint. No new
// shades: the tint IS the token at low alpha, authored once in globals.css.
//
// And each carries a SHAPE, not only a colour (§3.3, §9 — colour is never the
// only carrier of meaning). A filled dot in `currentColor`, from the same
// declaration that sets the text colour, so a variant cannot gain a colour
// without gaining its dot. It costs 6px and it survives greyscale.
const SEMANTIC_DOT =
  "before:size-1.5 before:shrink-0 before:rounded-full before:bg-current before:content-['']"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border bg-input/30 text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",

        // ── Semantic states (§3.2). Meaning, not decoration. ──
        success: `bg-success-subtle text-success ${SEMANTIC_DOT}`,
        warning: `bg-warning-subtle text-warning ${SEMANTIC_DOT}`,
        danger: `bg-danger-subtle text-danger ${SEMANTIC_DOT}`,
        info: `bg-info-subtle text-info ${SEMANTIC_DOT}`,
        // Neutral is a state too — "not requested", "building". It gets the dot
        // like the rest, so a row of badges reads as one object rather than four
        // pills and a bare word.
        neutral: `bg-muted text-muted-foreground ${SEMANTIC_DOT}`,
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
