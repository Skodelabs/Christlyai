export const estimateTokens = (wordCount: number): number => {
  const baseTokens = wordCount * 1.33; // average English ratio
  const buffer = Math.max(1024, baseTokens * 0.25); // 25% buffer, min 1024
  const totalTokens = baseTokens + buffer;

  // Clamp between 4096 and 16000
  return Math.min(16000, Math.max(4096, Math.round(totalTokens)));
};
