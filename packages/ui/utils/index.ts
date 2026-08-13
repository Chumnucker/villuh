import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export * from "./format"
export * from "./uploads"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
