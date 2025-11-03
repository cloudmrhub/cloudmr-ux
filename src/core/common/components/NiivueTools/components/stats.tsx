export function calculateMean(numbers: number[]): number {
  const sum = numbers.reduce((acc, val) => acc + val, 0);
  return sum / numbers.length;
}

export function calculateStandardDeviation(numbers: number[]): number {
  const mean = calculateMean(numbers);
  const squareDiffs = numbers.map((value) => {
    const diff = value - mean;
    return diff * diff;
  });
  const avgSquareDiff = calculateMean(squareDiffs);
  return Math.sqrt(avgSquareDiff);
}
