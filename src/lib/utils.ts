import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ClassValue } from "clsx";
import { customAlphabet } from "nanoid";

export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs));
}

export function generateRandomString(size: number) {
  const generator = customAlphabet(
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  );
  return generator(size);
}
