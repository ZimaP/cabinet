import type { PartLayout } from '../../model'

/** Narrow flexible calculation metadata before it reaches geometry props. */
export function numericPartMetadata(
  part: PartLayout,
  key: string,
): number | undefined {
  const value = part.metadata[key]
  return typeof value === 'number' ? value : undefined
}

export function stringPartMetadata(
  part: PartLayout,
  key: string,
): string | undefined {
  const value = part.metadata[key]
  return typeof value === 'string' ? value : undefined
}
