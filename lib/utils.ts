import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number to always show 2 decimal places
 */
export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) {
    return "0.00"
  }
  return num.toFixed(2)
}

/**
 * Format a number as currency with peso sign, always showing 2 decimal places
 */
export function formatCurrency(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) {
    return "₱0.00"
  }
  return `₱${num.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Format a number as currency without peso sign, always showing 2 decimal places
 */
export function formatCurrencyPlain(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) {
    return "0.00"
  }
  return num.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
