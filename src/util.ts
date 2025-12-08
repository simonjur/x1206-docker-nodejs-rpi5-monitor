/**
 * Swaps the byte order of a 16-bit unsigned integer.
 */
export function swap16(value: number): number {
    return ((value & 0xff) << 8) | ((value >> 8) & 0xff);
}
