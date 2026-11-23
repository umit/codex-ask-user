import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ElicitRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const bundle = fileURLToPath(new URL("../plugins/ask-user/bin/server.cjs", import.meta.url));
const args = { question: "Which theme?", options: ["Mocha", "Frappé"] };

for (const scenario of ["selection", "custom", "cancel", "no form support"]) {
  test(scenario, async () => {
    const supportsForms = scenario !== "no form support";
    const client = new Client({ name: "test", version: "1" }, {
      capabilities: supportsForms ? { elicitation: { form: {} } } : {}
    });
    let forms = 0;
    if (supportsForms) {
      client.setRequestHandler(ElicitRequestSchema, ({ params }) => {
        forms++;
        assert.equal(params.message, args.question);
        const schema = params.requestedSchema;
        if (forms === 2) {
          assert.equal(scenario, "custom");
          assert.deepEqual(schema.required, ["custom"]);
          return { action: "accept", content: { custom: "  Nord  " } };
        }
        assert.deepEqual(schema.required, ["choice"]);
        const choices = schema.properties.choice.enum;
        assert.deepEqual(choices.slice(0, -1), args.options);
        if (scenario === "cancel") return { action: "cancel" };
        return { action: "accept", content: { choice: scenario === "custom" ? choices.at(-1) : "Frappé" } };
      });
    }
    try {
      await client.connect(new StdioClientTransport({ command: process.execPath, args: [bundle] }));
      const response = await client.callTool({ name: "ask_question", arguments: args });
      assert.ok(!response.isError);
      const expected = {
        selection: { status: "answered", answer: "Frappé" },
        custom: { status: "answered", answer: "Nord" },
        cancel: { status: "cancel" },
        "no form support": { status: "form_unavailable" }
      };
      assert.deepEqual(JSON.parse(response.content[0].text), expected[scenario]);
      assert.equal(forms, { selection: 1, custom: 2, cancel: 1, "no form support": 0 }[scenario]);
    } finally {
      await client.close();
    }
  });
}
