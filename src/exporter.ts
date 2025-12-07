import express from "express";
import type { Request, Response } from "express";
import * as client from "prom-client";
import { BoardReader } from "./board-reader.ts";
import * as process from "node:process";

const LISTEN_PORT = process.env.LISTEN_PORT ?? 3000;

const register = new client.Registry();

client.collectDefaultMetrics({ register });

function registerMetrics() {
    const capacity = new client.Gauge({
        name: `battery_capacity_percentage`,
        help: `Battery capacity percentage for X1206 board`,
        labelNames: ["type"],
    });
    const acPowerStatus = new client.Gauge({
        name: `ac_power_status`,
        help: `AC power status for X1206 board (1 = on, 0 = off)`,
        labelNames: ["type"],
    });
    const voltage = new client.Gauge({
        name: `battery_voltage_volts`,
        help: `Battery voltage in volts for X1206 board`,
        labelNames: ["type"],
    });
    register.registerMetric(capacity);
    register.registerMetric(acPowerStatus);
    register.registerMetric(voltage);
}

const reader = new BoardReader();

async function updateAllMetrics() {
    try {
        const data = await reader.getInfo();

        const capacity = register.getSingleMetric(
            "battery_capacity_percentage",
        ) as client.Gauge;
        const voltage = register.getSingleMetric(
            "battery_voltage_volts",
        ) as client.Gauge;
        const acPowerStatus = register.getSingleMetric(
            "ac_power_status",
        ) as client.Gauge;

        capacity.set({ type: "x1206" }, data.capacity ?? 0);
        acPowerStatus.set({ type: "x1206" }, data.acPowerState ?? 0);
        voltage.set({ type: "x1206" }, data.voltage ?? 0);
    } catch (err) {
        console.error("Error reading board data:", err);
        return;
    }
}

async function run() {
    registerMetrics();
    setInterval(updateAllMetrics, 5000);
    updateAllMetrics();

    const app = express();
    app.get("/metrics", async (req: Request, res: Response) => {
        res.set("Content-Type", register.contentType);
        res.end(await register.metrics());
    });

    app.listen(LISTEN_PORT, () => {
        console.log(
            `Prometheus x1206 exporter running at http://localhost:${LISTEN_PORT}/metrics`,
        );
    });

    process.on("SIGINT", () => {
        console.log("SIGINT received, shutting down...");
        app.close(() => {
            console.log("Server closed. Exiting.");
            process.exit(0);
        });
    });
}

run();
