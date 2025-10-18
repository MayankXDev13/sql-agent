"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

type AIInput = { query: string };
type AIOutputput = { rows: string[] };

export default function Chat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage } = useChat();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  // Auto-scroll while messages are added (works for streaming)
  useEffect(() => {
    const scrollContainer = containerRef.current;
    if (!scrollContainer) return;

    const observer = new MutationObserver(() => {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    });

    observer.observe(scrollContainer, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col w-full max-w-md mx-auto h-screen relative bg-zinc-50 dark:bg-zinc-900">
      {/* Messages container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 pt-6 pb-24 space-y-4"
      >
        {messages.map((message) => {
          const isUser = message.role === "user";

          return (
            <div
              key={message.id}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-lg relative ${
                  isUser
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-zinc-800 text-black dark:text-white"
                }`}
              >
                {/* Tail */}
                <div
                  className={`absolute w-0 h-0 border-[10px] bottom-0 ${
                    isUser
                      ? "right-0 border-t-blue-600 border-l-transparent border-r-transparent border-b-0"
                      : "left-0 border-t-white dark:border-t-zinc-800 border-l-transparent border-r-transparent border-b-0"
                  }`}
                  style={{
                    transform: isUser ? "translateX(50%)" : "translateX(-50%)",
                  }}
                />

                {/* Render all message parts */}
                {message.parts.map((part, i) => {
                  switch (part.type) {
                    case "text":
                      return (
                        <div
                          key={i}
                          className="whitespace-pre-wrap break-words"
                        >
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              code({ node, inline, className, children, ...props }) {
                                const match = /language-(\w+)/.exec(
                                  className || ""
                                );
                                return !inline && match ? (
                                  <SyntaxHighlighter
                                    style={isDark ? oneDark : oneLight}
                                    language={match[1]}
                                    PreTag="div"
                                    {...props}
                                  >
                                    {String(children).replace(/\n$/, "")}
                                  </SyntaxHighlighter>
                                ) : (
                                  <code className={className} {...props}>
                                    {children}
                                  </code>
                                );
                              },
                            }}
                          >
                            {part.text}
                          </ReactMarkdown>
                        </div>
                      );

                    case "tool-db":
                      return (
                        <div
                          key={i}
                          className="my-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800"
                        >
                          <div className="font-semibold text-blue-700 dark:text-blue-300 mb-1">
                            🔍 Database Query
                          </div>
                          {(part.input as AIInput)?.query && (
                            <pre className="text-xs bg-white dark:bg-zinc-900 p-2 rounded mb-2 overflow-x-auto">
                              {(part.input as AIInput).query}
                            </pre>
                          )}
                          {(part.state === "output-available" &&
                            (part.output as AIOutputput)) && (
                              <div className="text-sm text-green-700 dark:text-green-300">
                                ✅ Returned {(part.output as AIOutputput).rows?.length || 0} rows
                              </div>
                          )}
                        </div>
                      );

                    case "tool-schema":
                      return (
                        <div
                          key={i}
                          className="my-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-800"
                        >
                          <div className="font-semibold text-purple-700 dark:text-purple-300">
                            📋 Schema Tool
                          </div>
                          {part.state === "output-available" && (
                            <div className="text-sm text-green-700 dark:text-green-300 py-2">
                              ✅ Schema loaded
                            </div>
                          )}
                        </div>
                      );

                    case "step-start":
                      // Only render loader if all parts are still step-start
                      if (!message.parts.every((p) => p.type === "step-start"))
                        return null;
                      return (
                        <div
                          key={i}
                          className="flex items-center text-sm text-gray-500 dark:text-gray-400 space-x-2 animate-pulse mt-1"
                        >
                          <Loader2 className="animate-spin" size={16} />
                          <span>Processing...</span>
                        </div>
                      );

                    default:
                      return null;
                  }
                })}
              </div>
            </div>
          );
        })}
        <div />
      </div>

      {/* Input area */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim()) return;
          sendMessage({ text: input });
          setInput("");
        }}
        className="flex items-center px-4 py-3 border-t border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 fixed bottom-0 w-full max-w-md mx-auto space-x-2"
      >
        <Input
          placeholder="Ask about your database..."
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
          className="flex-1"
        />
        <Button type="submit">Send</Button>
      </form>
    </div>
  );
}
