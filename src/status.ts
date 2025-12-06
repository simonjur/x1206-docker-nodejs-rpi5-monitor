import {BoardReader} from "./board.ts";

async function run () {
    try {
        const reader = new BoardReader();
        const data = await reader.getInfo();

        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Error reading board data:", err);
        return;
    }
}

run();