const fs = require('fs');
const path = require('path');
const chalk = require('chalk'); 
const {
  DisconnectReason,
  useMultiFileAuthState,
} = require("@whiskeysockets/baileys");
const makeWASocket = require("@whiskeysockets/baileys").default;
async function connectionLogic() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");
  const sock = makeWASocket({
    printQRInTerminal: true,
    auth: state,
  });
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update || {};
    if (qr) {
      console.log(chalk.green(qr));    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;
      if (shouldReconnect) {
        console.log(chalk.yellow('Connection closed. Reconnecting...'));
        connectionLogic();
      } else {
        console.log(chalk.red('Logged out, not reconnecting.'));
      }
    }
    if (connection === "open") {
      console.log(chalk.blue('Connection opened.'));     
      const numbersToCheck = fs.readFileSync('numbers.txt', 'utf8').split('\n');
      for (const number of numbersToCheck) {
        if (number.trim()) {
          await checkNumberOnWhatsApp(sock, number.trim());
        }
      }
    }
  });
  sock.ev.on("creds.update", saveCreds);
}
async function checkNumberOnWhatsApp(sock, id) {
  const [result] = await sock.onWhatsApp(id);
  let logMessage = '';
  if (result?.exists) {
      console.log(chalk.green(`${id} On WA`));
      logMessage = `${id},On WA,\n`;
  } else {
      console.log(chalk.red(`${id} Not WA`));
      logMessage = `${id},Not WA,\n`;
  }
  const csvFilePath = path.join(__dirname, 'whatsapp_results.csv');
  fs.appendFileSync(csvFilePath, logMessage);
}
connectionLogic();
