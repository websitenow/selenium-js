const express = require("express");
const http = require("http");
const socketIO = require("socket.io");

const { Builder, Button, Origin } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

const url = "https://google.com"//"https://twitter.com/i/flow/login"
//1050x500

/* ========== */
const app = express();
const server = http.createServer(app);
const io = socketIO(server);
let viewport = {width: 1080, height: 720}
let driver;
let actions;
/* ========== */

/* FUNCTIONS */
async function click(socket, x, y) {
    if (socket && viewport && actions && typeof (x) === 'number' && typeof (y) === 'number') {
        // Ajustando os limites para x e y
        x = parseInt(Math.max(1, Math.min(x, viewport.width - 1)));
        y = parseInt(Math.max(1, Math.min(y, viewport.height - 1)));

        await actions
            .move({ x: x, y: y, origin: Origin.POINTER })
            .click()
            .perform();

        console.log(`Click: (${x}, ${y})`);
    } else {
        console.log("Não foi possível clicar!");
    }
}

async function injectScript(pos) {
    if (driver) {
        await driver.executeScript(`let b = document.createElement("div");
b.style.width = "30px";
b.style.height = "30px";
b.style.position = "fixed";
b.style.backgroundColor = "green";
b.style.left = "calc(${parseInt(pos.x)}px - 15px)";
b.style.top = "calc(${parseInt(pos.y)}px - 15px)";
b.style.zIndex = "999999";
b.style.borderRadius = "50%";
document.body.appendChild(b);`);

    }
}

async function sendScreenShot(socket) {
    if (driver) {
        const screenshot = await driver.takeScreenshot()
        socket.emit("screenshot", screenshot)
    }
}

async function startWebdriver() {
    await (async function () {
        // const proxy = 'http://...:....';
        const chromeOptions = new chrome.Options();

        // chromeOptions.addArguments(`--proxy-server=${proxy}`);
        chromeOptions.addArguments('--headless'); // Executar em modo headless
        chromeOptions.addArguments('--no-sandbox'); // Necessário em alguns ambientes
        chromeOptions.addArguments('--disable-dev-shm-usage'); // Para evitar problemas de memória
        chromeOptions.addArguments('--disable-gpu');
        chromeOptions.addArguments('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36');
        chromeOptions.addArguments('--disable-extensions');
        // chromeOptions.addArguments('--disable-blink-features=AutomationControlled');
        chromeOptions.addArguments(`window-size=${viewport.width},${viewport.height}`);

        driver = await new Builder().forBrowser('chrome').setChromeOptions(chromeOptions).build();
        await driver.manage().window().fullscreen()
        actions = driver.actions({ async: true, bridge: true })
        // viewport = await driver.manage().window().getSize()

        try {
            await driver.get(url)
            const title = await driver.getTitle()
            console.log(title)
        } catch (e) {
            console.log("\x1b[31mWebdriver Error\x1b[m: ", e)
        }
    })();
}
/* ========== */

(async () => {
    await startWebdriver()
    console.log("STARTED WEBDRIVER")

    /* SOCKET AREA */
    io.on("connection", (socket) => {
        console.log("\x1b[32m>>> Um usuário conectado\x1b[m");
        // Escuta eventos de mensagens
        socket.on("con", () => {
            socket.emit("con", viewport)
        });

        socket.on("click", async (pos) => {
            click(socket, pos.x, pos.y)
            injectScript(pos)
        })

        socket.on("screenshot", async () => {
            sendScreenShot(socket)
        })

        // Evento quando o usuário se desconecta
        socket.on("disconnect", () => {
            console.log("Usuário desconectado");
        });
    });
    /* =========== */


    /* SERVER AREA */
    app.get("/", (req, res) => {
        res.sendFile(__dirname + "/templates/index.html");
    });

    const PORT = 3000;
    server.listen(PORT, () => {
        console.log(`\x1b[33mServidor rodando na porta ${PORT}\x1b[m`);
    });

})()
/* =========== */