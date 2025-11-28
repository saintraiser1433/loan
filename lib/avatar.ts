/**
 * Generate a DiceBear neutral avatar URL
 * @param seed - A unique identifier (e.g., email, name, or user ID)
 * @returns DiceBear neutral avatar URL
 */
export function getDiceBearAvatar(seed: string): string {
  // Use the seed to generate a consistent avatar
  // If seed is empty, use a default
  const avatarSeed = seed || "default"
  return `https://api.dicebear.com/8.x/avataaars-neutral/svg?seed=${encodeURIComponent(avatarSeed)}`
}

