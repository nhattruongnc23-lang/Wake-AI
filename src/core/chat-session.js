import { streamChatCompletion } from "../providers/openai-compatible.js";
import { loadSession, saveSession } from "./session-store.js";

export class ChatSession {
  constructor({ config, storePath }) {
    this.config = config;
    this.storePath = storePath;
    this.messages = [];
  }

  async initialize() {
    this.messages = await loadSession(this.storePath);
  }

  async clear() {
    this.messages = [];
    await saveSession(this.storePath, this.messages);
  }

  async send(text, onToken) {
    const userMessage = { role: "user", content: text };
    const requestMessages = [
      { role: "system", content: this.config.systemPrompt },
      ...this.messages,
      userMessage
    ];

    let answer = "";
    try {
      for await (const token of streamChatCompletion({
        config: this.config,
        messages: requestMessages
      })) {
        answer += token;
        onToken(token);
      }
    } catch (error) {
      throw error;
    }

    if (!answer.trim()) {
      throw new Error("The model returned an empty answer.");
    }

    this.messages.push(userMessage, { role: "assistant", content: answer });
    await saveSession(this.storePath, this.messages);
    return answer;
  }
}
