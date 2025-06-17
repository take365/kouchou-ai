export function sampleWithSeed<T>(array: T[], n: number, seed = 42): T[] {
  let result = array.slice();
  let s = seed;
  function random() {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  }
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result.slice(0, n);
}
