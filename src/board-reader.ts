import { openPromisified } from "i2c-bus";
import type { PromisifiedBus } from "i2c-bus";
import gpiod from "node-libgpiod";
import { swap16 } from "./util.ts";

const I2C_BUS_NUMBER = 1;
const BATTERY_I2C_ADDRESS = 0x36;
const PLD_PIN = 6; // GPIO line number
const GPIO_CHIP_NAME = "gpiochip0"; // As per Python comment for kernel >= 6.6.45

export class BoardReader {
    chip: gpiod.Chip;
    pldLine: gpiod.Line;

    public constructor() {
        // const rawBus = i2c.openSync(I2C_BUS_NUMBER);
        // const rawBus = openPromisified(I2C_BUS_NUMBER);

        this.chip = new gpiod.Chip(GPIO_CHIP_NAME);
        this.pldLine = this.chip.getLine(PLD_PIN);
    }

    private getBatteryStatus(voltage: number) {
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

    private async readVoltage(bus: PromisifiedBus) {
        // Equivalent to read_word_data(address, 2) in Python
        const raw = await bus.readWord(BATTERY_I2C_ADDRESS, 2);
        const swapped = swap16(raw);
        return (swapped * 1.25) / 1000 / 16;
    }

    private async readCapacity(bus: PromisifiedBus) {
        // Equivalent to read_word_data(address, 4) in Python
        const raw = await bus.readWord(BATTERY_I2C_ADDRESS, 4);
        const swapped = swap16(raw);
        return swapped / 256.0;
    }

    public async getInfo() {
        const bus: PromisifiedBus = await openPromisified(I2C_BUS_NUMBER);
        this.pldLine.requestInputMode("PLD");

        let acPowerState = 1;
        let voltage = 0;
        let capacity = 0;

        // Read AC power state: 1 = plugged in, 0 = unplugged
        acPowerState = this.pldLine.getValue();

        voltage = await this.readVoltage(bus);
        capacity = await this.readCapacity(bus);
        const batteryStatus = this.getBatteryStatus(voltage);

        await this.pldLine.release();
        await bus.close();

        return {
            capacity,
            batteryStatus,
            acPowerState,
            voltage,
        };
    }
}
