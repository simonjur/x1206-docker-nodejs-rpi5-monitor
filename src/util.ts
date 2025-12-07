export function swap16(value: number): number {
    return ((value & 0xff) << 8) | ((value >> 8) & 0xff);
}
