import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { resolve } from "node:path";
import { loadEnvFile, getConfig } from "../config.js";
import { ChatSession } from "../core/chat-session.js";

const VERSION = "0.1.0";

function showHelp() {
  stdout.write(`
Commands
  /help          Show this help
  /model         Show the current model
  /model NAME    Change the model for this session
  /clear         Clear the saved conversation
  /exit          Exit Wake AI

Tip: set WAKE_BASE_URL and WAKE_MODEL in .env before starting.
`);
}

async function main() {
  await loadEnvFile();
  const config = getConfig();
  const session = new ChatSession({
    config,
    storePath: resolve(".wake/sessions/default.json")
  });
  await session.initialize();

  stdout.write(`
Wake AI v${VERSION}
Terminal coding assistant · Node.js ${process.versions.node}
Model: ${config.model}
Endpoint: ${config.baseUrl}
Loaded ${session.messages.length / 2} saved message(s).
Type /help for commands. Use /exit to quit.

`);

  const rl = createInterface({
    input: stdin,
    output: stdout,
    terminal: true
  });

  try {
    while (true) {
      let input;
      try {
        input = (await rl.question("you › ")).trim();
      } catch {
        break;
      }

      if (!input) continue;
      if (input === "/exit" || input === "/quit") break;

      if (input === "/help") {
        showHelp();
        continue;
      }

      if (input === "/model") {
        stdout.write(`Current model: ${config.model}\n`);
        continue;
      }

      if (input.startsWith("/model ")) {
        config.model = input.slice(7).trim() || config.model;
        stdout.write(`Model set to: ${config.model}\n`);
        continue;
      }

      if (input === "/clear") {
        await session.clear();
        stdout.write("Conversation cleared.\n");
        continue;
      }

      stdout.write("\nwake › ");
      try {
        await session.send(input, token => stdout.write(token));
        stdout.write("\n\n");
      } catch (error) {
        stdout.write(`\n\n[Wake error] ${error.message}\n\n`);
      }
    }
  } finally {
    rl.close();
    stdout.write("\nWake AI closed.\n");
  }
}

main().catch(error => {
  console.error("Wake AI failed to start:", error.message);
  process.exitCode = 1;
});
