import { db } from "@/db/db";
import { openai } from "@ai-sdk/openai";
import {
  streamText,
  UIMessage,
  convertToModelMessages,
  tool,
  stepCountIs,
} from "ai";
import { z } from "zod";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const SYSTEM_PROMT = `You are an expert SQL assistant that helps users query their databases using natural language.
Current Date & Time: ${new Date().toLocaleString("sv-SE")}

🧰 Available Tools

Schema Tool – Use this to retrieve the database schema before writing any queries.

DB Tool – Use this to execute SQL queries against the database.

⚙️ Rules

✅ Only generate SELECT queries.
(Never use INSERT, UPDATE, DELETE, or DROP.)

🧩 Always reference the schema provided by the Schema Tool before writing a query.

🧠 Ensure all generated queries are valid SQL syntax and compatible with the given database.

💬 Respond in a helpful, conversational, and technically accurate tone.

🪶 Keep explanations clear and concise — make sure the user understands what the query does.

🎯 Goal

Help users transform natural language requests into accurate SQL queries, explaining your reasoning briefly when needed.
  `;

  const result = streamText({
    model: openai("gpt-5-nano-2025-08-07"),
    messages: convertToModelMessages(messages),
    system: SYSTEM_PROMT,
    stopWhen: stepCountIs(5),
    tools: {
      db: tool({
        description: "Call this tool to query a database",
        inputSchema: z.object({
          query: z.string().describe("The SQL query to be ran"),
        }),
        execute: async ({ query }) => {
          // Important: make sure  you sanitize / validate(somehow) check the qury
          // string search [delete, update] -> Guardrails

          return await db.run(query);
        },
      }),
      schema: tool({
        description: "Call this tool to get database schema information",
        inputSchema: z.object(),
        execute: async () => {
          return `
          CREATE TABLE products (
          id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          name text NOT NULL,
          category text NOT NULL,
          price real NOT NULL,
          stock integer DEFAULT 0 NOT NULL,
          created_at text DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE sales (
          id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          product_id integer NOT NULL,
          quantity integer NOT NULL,
          total_amount real NOT NULL,
          sale_date text DEFAULT CURRENT_TIMESTAMP,
          region text NOT NULL,
          FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE no action ON DELETE no action
        );
          `;
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
