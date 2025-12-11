import { BoardReader } from "./board-reader.ts";
import { Command } from "commander";
import { printTable } from "console-table-printer";
import * as process from "node:process";

const program = new Command();

program.option("--json", "Output in JSON format");

program.parse();

async function run(json: boolean) {
    try {
        const reader = new BoardReader();
        const data = await reader.getInfo();

        if (json) {
            console.log(JSON.stringify(data, null, 2));
        } else {
            printTable([
                {
                    Metric: "Capacity (%)",
                    Value: data.capacity?.toFixed(2) ?? "N/A",
                },
                {
                    Metric: "Voltage (V)",
                    Value: data.voltage?.toFixed(3) ?? "N/A",
                },
                {
                    Metric: "AC Power State",
                    Value: data.acPowerState === 1 ? "On" : "Off",
                },
                { Metric: "Battery status", Value: data.batteryStatus },
            ]);
        }
    } catch (err) {
        console.error("Error reading board data:", err);
        process.exit(1);
    }
}

const options = program.opts();

await run(options.json);
