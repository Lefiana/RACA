// File: packages/ui/src/lib/utils.ts
// Purpose: cn() helper — merges Tailwind classes safely
// Dependencies: clsx, tailwind-merge
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}