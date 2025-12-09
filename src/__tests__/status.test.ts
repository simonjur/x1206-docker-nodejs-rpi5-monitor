import { describe, expect, it } from "vitest";
import { swap16 } from "../util.js";

describe("swap16", () => {
    it("swaps typical values", () => {
        expect(swap16(0x1234)).toBe(0x3412);
        expect(swap16(0xabcd)).toBe(0xcdab);
    });

    it("handles boundaries", () => {
        expect(swap16(0x0000)).toBe(0x0000);
        expect(swap16(0xffff)).toBe(0xffff);
    });

    it("is its own inverse", () => {
        const values = [0x0001, 0x00f0, 0xff00, 0xdead];
        for (const value of values) {
            expect(swap16(swap16(value))).toBe(value);
        }
    });
});

