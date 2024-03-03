export function tryParseInt(value: string | undefined): number | undefined {
  return value ? parseInt(value) : undefined;
}
