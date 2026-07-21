const SIXTEENTHS_PER_INCH = 16

function greatestCommonDivisor(a: number, b: number): number {
  let left = a
  let right = b

  while (right !== 0) {
    const remainder = left % right
    left = right
    right = remainder
  }

  return left
}

/**
 * Formats a nominal inch value as an architectural fraction rounded to the
 * nearest 1/16 inch. Rounding the complete value to an integer number of
 * sixteenths first naturally carries 16/16 into the next whole inch and keeps
 * floating-point noise out of the displayed measurement.
 */
export function formatInches(value: number): string {
  if (!Number.isFinite(value)) {
    throw new RangeError('An inch measurement must be a finite number.')
  }

  const roundedSixteenths = Math.round(
    Math.abs(value) * SIXTEENTHS_PER_INCH,
  )
  const wholeInches = Math.floor(roundedSixteenths / SIXTEENTHS_PER_INCH)
  const remainingSixteenths = roundedSixteenths % SIXTEENTHS_PER_INCH
  const sign = value < 0 && roundedSixteenths !== 0 ? '-' : ''

  if (remainingSixteenths === 0) {
    return `${sign}${wholeInches}"`
  }

  const divisor = greatestCommonDivisor(
    remainingSixteenths,
    SIXTEENTHS_PER_INCH,
  )
  const numerator = remainingSixteenths / divisor
  const denominator = SIXTEENTHS_PER_INCH / divisor
  const fraction = `${numerator}/${denominator}`

  return wholeInches === 0
    ? `${sign}${fraction}"`
    : `${sign}${wholeInches} ${fraction}"`
}
