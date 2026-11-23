import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "ask-user", version: "1.0.2" });

function result(status, answer) {
  const payload = answer === undefined ? { status } : { status, answer };
  return { content: [{ type: "text", text: JSON.stringify(payload) }] };
}

function askField(message, name, schema, context) {
  return server.server.elicitInput({
    mode: "form",
    message,
    requestedSchema: {
      type: "object",
      properties: { [name]: schema },
      required: [name]
    }
  }, { signal: context.signal, relatedRequestId: context.requestId, timeout: 3600000 });
}

server.registerTool("ask_question", {
  title: "Ask a question",
  description: "Ask one multiple-choice question and wait for the user's selection or custom answer.",
  inputSchema: {
    question: z.string().trim().min(1),
    options: z.array(z.string().trim().min(1)).min(2).refine(
      values => new Set(values).size === values.length, "Provide distinct choices"
    )
  },
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
}, async ({ question, options }, context) => {
  if (!server.server.getClientCapabilities()?.elicitation?.form) {
    return result("form_unavailable");
  }
  let writeAnswer = "Write my own answer…";
  while (options.includes(writeAnswer)) writeAnswer += "…";

  const selection = await askField(question, "choice", {
    type: "string",
    title: "Options",
    description: "Use the arrow keys to select, then press Enter to send. Press Space to select the first option.",
    enum: [...options, writeAnswer]
  }, context);
  if (selection.action !== "accept") return result(selection.action);
  const choice = selection.content?.choice;
  if (options.includes(choice)) return result("answered", choice);
  if (choice !== writeAnswer) return result("unanswered");

  const custom = await askField(question, "custom", {
    type: "string", title: "Your answer", minLength: 1
  }, context);
  if (custom.action !== "accept") return result(custom.action);
  const answer = custom.content?.custom?.trim();
  return answer ? result("answered", answer) : result("unanswered");
});

server.connect(new StdioServerTransport()).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
