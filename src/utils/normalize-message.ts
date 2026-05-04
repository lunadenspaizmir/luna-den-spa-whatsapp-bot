export function normalizeMessage(input: string): string {
  return input
    .normalize("NFKC")
    .toLocaleLowerCase("tr-TR")
    .trim()
    .replace(/\s+/g, " ");
}