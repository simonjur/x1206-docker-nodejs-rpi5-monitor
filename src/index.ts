#!/usr/bin/env node

import * as fs from "fs";
import { exec } from "child_process";
import * as i2c from "i2c-bus";
// node-libgpiod: https://www.npmjs.com/package/node-libgpiod
import gpiod from "node-libgpiod";

// -------------------- User-configurable variables --------------------

const SHUTDOWN_THRESHOLD = 3; // Number of consecutive failures required for shutdown
const SLEEP_TIME_MS = 60_000; // Time in ms to wait between failure checks
const Loop = false; // If false, exit after a normal pass

// -------------------- Constants / Config --------------------

const PID_FILE = "X1200.pid";
const I2C_BUS_NUMBER = 1;
const BATTERY_I2C_ADDRESS = 0x36;
const PLD_PIN = 6; // GPIO line number
const GPIO_CHIP_NAME = "gpiochip0"; // As per Python comment for kernel >= 6.6.45

// -------------------- Helper functions --------------------

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Reading word and swapping bytes to replicate Python's struct.unpack("<H", struct.pack(">H", read))
function swap16(value: number): number {
    return ((value & 0xff) << 8) | ((value >> 8) & 0xff);
}

async function readVoltage(bus: i2c.PromisifiedBus): Promise<number> {
    // Equivalent to read_word_data(address, 2) in Python
    const raw = await bus.readWord(BATTERY_I2C_ADDRESS, 2);
    const swapped = swap16(raw);
    const voltage = (swapped * 1.25) / 1000 / 16;
    return voltage;
}

async function readCapacity(bus: i2c.PromisifiedBus): Promise<number> {
    // Equivalent to read_word_data(address, 4) in Python
    const raw = await bus.readWord(BATTERY_I2C_ADDRESS, 4);
    const swapped = swap16(raw);
    const capacity = swapped / 256.0;
    return capacity;
}

function getBatteryStatus(voltage: number): string {
    if (voltage >= 3.87 && voltage <= 4.2) {
        return "Full";
    } else if (voltage >= 3.7 && voltage < 3.87) {
        return "High";
    } else if (voltage >= 3.55 && voltage < 3.7) {
        return "Medium";
    } else if (voltage >= 3.4 && voltage < 3.55) {
        return "Low";
    } else if (voltage < 3.4) {
        return "Critical";
    } else {
        return "Unknown";
    }
}

function initiateShutdown(reasonText: string): void {
    const shutdownMessage = `Critical condition met ${reasonText} Initiating shutdown.`;
    console.log(shutdownMessage);

    // In Docker/root context you might want just "shutdown -h now"
    exec("sudo nohup shutdown -h now", (error, stdout, stderr) => {
        if (error) {
            console.error("Error executing shutdown:", error);
            return;
        }
        if (stdout.trim()) console.log(stdout.trim());
        if (stderr.trim()) console.error(stderr.trim());
    });
}

function ensureSingleInstance(): void {
    if (fs.existsSync(PID_FILE)) {
        console.error("Script already running");
        process.exit(1);
    }

    try {
        fs.writeFileSync(PID_FILE, String(process.pid), { encoding: "utf8" });
    } catch (err) {
        console.error("Failed to create PID file:", err);
        process.exit(1);
    }
}

function cleanupAndExit(code: number = 0): void {
    try {
        if (fs.existsSync(PID_FILE)) {
            fs.unlinkSync(PID_FILE);
        }
    } catch (err) {
        console.error("Error removing PID file:", err);
    }
    process.exit(code);
}

// -------------------- Main monitoring logic --------------------

async function main(): Promise<void> {
    ensureSingleInstance();

    let bus: i2c.PromisifiedBus | null = null;
    let chip: gpiod.Chip | null = null;
    let pldLine: gpiod.Line | null = null;

    try {
        // Open I2C bus (promisified for async/await)
        const rawBus = i2c.openSync(I2C_BUS_NUMBER);
        // Wrap with promises
        bus = rawBus.promisifiedBus();

        // Open GPIO chip via node-libgpiod
        chip = new gpiod.Chip(GPIO_CHIP_NAME);
        pldLine = chip.getLine(PLD_PIN);

        // Request line as input
        pldLine.requestInputMode("PLD");
        // pldLine.request({
        //     consumer: "PLD",
        //     direction: gpiod.Line.Direction.INPUT,
        // });

        while (true) {
            let failureCounter = 0;
            let acPowerState = 1;
            let voltage = 0;
            let capacity = 0;

            for (let i = 0; i < SHUTDOWN_THRESHOLD; i++) {
                // Read AC power state: 1 = plugged in, 0 = unplugged
                acPowerState = pldLine.getValue();

                voltage = await readVoltage(bus);
                capacity = await readCapacity(bus);
                const batteryStatus = getBatteryStatus(voltage);

                console.log(
                    `Capacity: ${capacity.toFixed(2)}% (${batteryStatus}), ` +
                        `AC Power State: ${acPowerState === 1 ? "Plugged in" : "Unplugged"}, ` +
                        `Voltage: ${voltage.toFixed(2)}V`,
                );

                if (acPowerState === 0) {
                    console.log("UPS is unplugged or AC power loss detected.");
                    failureCounter += 1;

                    if (capacity < 20) {
                        console.log("Battery level critical.");
                        failureCounter += 1;
                    }
                    if (voltage < 3.2) {
                        console.log("Battery voltage critical.");
                        failureCounter += 1;
                    }
                } else {
                    // Power is OK, reset and break inner loop
                    failureCounter = 0;
                    break;
                }

                if (failureCounter < SHUTDOWN_THRESHOLD) {
                    await sleep(SLEEP_TIME_MS);
                }
            }

            if (failureCounter >= SHUTDOWN_THRESHOLD) {
                let shutdownReason = "";
                if (capacity < 20) {
                    shutdownReason = "due to critical battery level.";
                } else if (voltage < 3.2) {
                    shutdownReason = "due to critical battery voltage.";
                } else if (acPowerState === 0) {
                    shutdownReason = "due to AC power loss or UPS unplugged.";
                }

                initiateShutdown(shutdownReason);
                // Allow some time after initiating shutdown, then exit
                await sleep(5000);
                break;
            } else {
                if (Loop) {
                    await sleep(SLEEP_TIME_MS);
                } else {
                    break;
                }
            }
        }
    } catch (err) {
        console.error("Error in UPS monitor:", err);
    } finally {
        try {
            if (pldLine) {
                pldLine.release();
            }
        } catch (e) {
            console.error("Error releasing GPIO line:", e);
        }
        // try {
        //     // if (chip) {
        //     //     chip.d;
        //     // }
        // } catch (e) {
        //     console.error("Error closing GPIO chip:", e);
        // }
        try {
            // node-libgpiod doesn't manage I2C; we close the raw bus here.
            if (bus) {
                // @ts-expect-error: underlying sync bus not typed here
                bus._bus.closeSync?.();
            }
        } catch (e) {
            console.error("Error closing I2C bus:", e);
        }

        cleanupAndExit(0);
    }
}

// Handle termination signals to clean up PID file
process.on("SIGINT", () => cleanupAndExit(0));
process.on("SIGTERM", () => cleanupAndExit(0));

void main();
