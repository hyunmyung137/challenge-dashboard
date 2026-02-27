import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUSD(value: number, decimals = 2): string {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return (value < 0 ? "-$" : "$") + formatted;
}

export function formatPct(value: number, decimals = 2): string {
  return (value >= 0 ? "+" : "") + value.toFixed(decimals) + "%";
}

export function formatPnl(value: number): string {
  return (value >= 0 ? "+" : "") + formatUSD(value);
}
