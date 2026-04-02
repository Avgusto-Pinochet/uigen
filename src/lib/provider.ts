import { anthropic } from "@ai-sdk/anthropic";
import {
  LanguageModelV1,
  LanguageModelV1StreamPart,
  LanguageModelV1Message,
} from "@ai-sdk/provider";

const MODEL = "claude-haiku-4-5-20251001";

export class MockLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = "v1" as const;
  readonly provider = "mock";
  readonly modelId: string;
  readonly defaultObjectGenerationMode = "tool" as const;

  constructor(modelId: string) {
    this.modelId = modelId;
  }

  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractUserPrompt(messages: LanguageModelV1Message[]): string {
    // Find the last user message
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === "user") {
        const content = message.content;
        if (Array.isArray(content)) {
          // Extract text from content parts
          const textParts = content
            .filter((part: any) => part.type === "text")
            .map((part: any) => part.text);
          return textParts.join(" ");
        } else if (typeof content === "string") {
          return content;
        }
      }
    }
    return "";
  }

  private getLastToolResult(messages: LanguageModelV1Message[]): any {
    // Find the last tool message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "tool") {
        const content = messages[i].content;
        if (Array.isArray(content) && content.length > 0) {
          return content[0];
        }
      }
    }
    return null;
  }

  private async *generateMockStream(
    messages: LanguageModelV1Message[],
    userPrompt: string
  ): AsyncGenerator<LanguageModelV1StreamPart> {
    // Count tool messages to determine which step we're on
    const toolMessageCount = messages.filter((m) => m.role === "tool").length;

    // Determine component type from the original user prompt
    const promptLower = userPrompt.toLowerCase();
    let componentType = "counter";
    let componentName = "Counter";

    if (promptLower.includes("form")) {
      componentType = "form";
      componentName = "ContactForm";
    } else if (promptLower.includes("card")) {
      componentType = "card";
      componentName = "Card";
    }

    // Step 1: Create component file
    if (toolMessageCount === 1) {
      const text = `I'll create a ${componentName} component for you.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(25);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_1`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "create",
          path: `/components/${componentName}.jsx`,
          file_text: this.getComponentCode(componentType),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 2: Enhance component
    if (toolMessageCount === 2) {
      const text = `Now let me enhance the component with better styling.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(25);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_2`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "str_replace",
          path: `/components/${componentName}.jsx`,
          old_str: this.getOldStringForReplace(componentType),
          new_str: this.getNewStringForReplace(componentType),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 3: Create App.jsx
    if (toolMessageCount === 0) {
      const text = `This is a static response. You can place an Anthropic API key in the .env file to use the Anthropic API for component generation. Let me create an App.jsx file to display the component.`;
      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(15);
      }

      yield {
        type: "tool-call",
        toolCallType: "function",
        toolCallId: `call_3`,
        toolName: "str_replace_editor",
        args: JSON.stringify({
          command: "create",
          path: "/App.jsx",
          file_text: this.getAppCode(componentName),
        }),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          promptTokens: 50,
          completionTokens: 30,
        },
      };
      return;
    }

    // Step 4: Final summary (no tool call)
    if (toolMessageCount >= 3) {
      const text = `Perfect! I've created:

1. **${componentName}.jsx** - A fully-featured ${componentType} component
2. **App.jsx** - The main app file that displays the component

The component is now ready to use. You can see the preview on the right side of the screen.`;

      for (const char of text) {
        yield { type: "text-delta", textDelta: char };
        await this.delay(30);
      }

      yield {
        type: "finish",
        finishReason: "stop",
        usage: {
          promptTokens: 50,
          completionTokens: 50,
        },
      };
      return;
    }
  }

  private getComponentCode(componentType: string): string {
    switch (componentType) {
      case "form":
        return `import React, { useState } from 'react';

const ContactForm = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [focused, setFocused] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Thank you for reaching out!");
  };

  const inputStyle = (field) => ({
    width: '100%',
    padding: '0 0 10px 0',
    border: 'none',
    borderBottom: '2px solid ' + (focused === field ? '#111827' : '#e5e7eb'),
    outline: 'none',
    fontSize: '15px',
    color: '#111827',
    background: 'transparent',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  });

  const labelStyle = (field) => ({
    display: 'block',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: focused === field ? '#111827' : '#9ca3af',
    marginBottom: '8px',
    transition: 'color 0.2s',
  });

  return (
    <div style={{ background: 'white', borderRadius: '20px', padding: '48px 40px', boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 4px 32px rgba(0,0,0,0.08)' }}>
      <h2 style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-0.03em', color: '#111827', margin: '0 0 8px 0' }}>
        Get in touch
      </h2>
      <p style={{ color: '#9ca3af', fontSize: '15px', margin: '0 0 40px 0' }}>
        We'll respond within 24 hours.
      </p>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '28px' }}>
          <label style={labelStyle('name')}>Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            onFocus={() => setFocused('name')}
            onBlur={() => setFocused(null)}
            required
            style={inputStyle('name')}
          />
        </div>
        <div style={{ marginBottom: '28px' }}>
          <label style={labelStyle('email')}>Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused(null)}
            required
            style={inputStyle('email')}
          />
        </div>
        <div style={{ marginBottom: '40px' }}>
          <label style={labelStyle('message')}>Message</label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            onFocus={() => setFocused('message')}
            onBlur={() => setFocused(null)}
            required
            rows={4}
            style={{ ...inputStyle('message'), resize: 'none' }}
          />
        </div>
        <button
          type="submit"
          style={{ width: '100%', padding: '14px', background: '#111827', color: 'white', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}
        >
          Send Message
        </button>
      </form>
    </div>
  );
};

export default ContactForm;`;

      case "card":
        return `import React from 'react';

const Card = ({
  title = "Amazing Product",
  description = "This is a fantastic product that will change your life. Experience the difference today!",
  badge = "New"
}) => {
  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.35) 0%, rgba(168,85,247,0.2) 100%)', borderRadius: '22px', padding: '1.5px' }}>
      <div style={{ background: '#0d0d16', borderRadius: '21px', padding: '36px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-100px', right: '-80px', width: '280px', height: '280px', background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '-40px', width: '180px', height: '180px', background: 'radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />
        {badge && (
          <span style={{ display: 'inline-block', background: 'linear-gradient(90deg, #6366f1, #a855f7)', color: 'white', fontSize: '10px', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 12px', borderRadius: '999px', marginBottom: '24px' }}>
            {badge}
          </span>
        )}
        <h3 style={{ color: 'white', fontSize: '28px', fontWeight: '800', letterSpacing: '-0.025em', lineHeight: '1.15', margin: '0 0 12px 0' }}>
          {title}
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.48)', fontSize: '15px', lineHeight: '1.65', margin: '0 0 32px 0' }}>
          {description}
        </p>
        <button style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'transparent', border: '1.5px solid rgba(99,102,241,0.45)', color: '#a5b4fc', padding: '10px 22px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', letterSpacing: '0.03em' }}>
          Learn More →
        </button>
      </div>
    </div>
  );
};

export default Card;`;

      default:
        return `import { useState } from 'react';

const Counter = () => {
  const [count, setCount] = useState(0);

  return (
    <div style={{ background: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 4px 32px rgba(0,0,0,0.08)' }}>
      <div style={{ height: '3px', background: 'linear-gradient(90deg, #f59e0b, #ef4444, #8b5cf6, #3b82f6)' }} />
      <div style={{ padding: '48px 40px', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#9ca3af', margin: '0 0 16px 0' }}>
          Counter
        </p>
        <div style={{ fontSize: '88px', fontWeight: '900', fontFamily: 'ui-monospace, monospace', letterSpacing: '-0.05em', lineHeight: '1', color: count === 0 ? '#d1d5db' : count > 0 ? '#111827' : '#ef4444', margin: '0 0 48px 0', transition: 'color 0.25s' }}>
          {count}
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            onClick={() => setCount(count - 1)}
            style={{ width: '48px', height: '48px', borderRadius: '12px', border: '1.5px solid #e5e7eb', background: 'white', fontSize: '22px', fontWeight: '300', cursor: 'pointer', color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            −
          </button>
          <button
            onClick={() => setCount(0)}
            style={{ padding: '0 20px', height: '48px', borderRadius: '12px', border: '1.5px solid #e5e7eb', background: 'white', fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', color: '#9ca3af' }}
          >
            Reset
          </button>
          <button
            onClick={() => setCount(count + 1)}
            style={{ width: '48px', height: '48px', borderRadius: '12px', border: '1.5px solid #e5e7eb', background: 'white', fontSize: '22px', fontWeight: '300', cursor: 'pointer', color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};

export default Counter;`;
    }
  }

  private getOldStringForReplace(componentType: string): string {
    switch (componentType) {
      case "form":
        return `    alert("Thank you for reaching out!");`;
      case "card":
        return `          Learn More →`;
      default:
        return `          onClick={() => setCount(count + 1)}`;
    }
  }

  private getNewStringForReplace(componentType: string): string {
    switch (componentType) {
      case "form":
        return `    alert("Thank you for reaching out!");
    setFormData({ name: '', email: '', message: '' });`;
      case "card":
        return `          Explore Now →`;
      default:
        return `          onClick={() => setCount(prev => prev + 1)}`;
    }
  }

  private getAppCode(componentName: string): string {
    if (componentName === "Card") {
      return `import Card from '@/components/Card';

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: '#08080f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <Card
          title="Amazing Product"
          description="This is a fantastic product that will change your life. Experience the difference today!"
          badge="New"
        />
      </div>
    </div>
  );
}`;
    }

    return `import ${componentName} from '@/components/${componentName}';

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        <${componentName} />
      </div>
    </div>
  );
}`;
  }

  async doGenerate(
    options: Parameters<LanguageModelV1["doGenerate"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV1["doGenerate"]>>> {
    const userPrompt = this.extractUserPrompt(options.prompt);

    // Collect all stream parts
    const parts: LanguageModelV1StreamPart[] = [];
    for await (const part of this.generateMockStream(
      options.prompt,
      userPrompt
    )) {
      parts.push(part);
    }

    // Build response from parts
    const textParts = parts
      .filter((p) => p.type === "text-delta")
      .map((p) => (p as any).textDelta)
      .join("");

    const toolCalls = parts
      .filter((p) => p.type === "tool-call")
      .map((p) => ({
        toolCallType: "function" as const,
        toolCallId: (p as any).toolCallId,
        toolName: (p as any).toolName,
        args: (p as any).args,
      }));

    // Get finish reason from finish part
    const finishPart = parts.find((p) => p.type === "finish") as any;
    const finishReason = finishPart?.finishReason || "stop";

    return {
      text: textParts,
      toolCalls,
      finishReason: finishReason as any,
      usage: {
        promptTokens: 100,
        completionTokens: 200,
      },
      warnings: [],
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {
          maxTokens: options.maxTokens,
          temperature: options.temperature,
        },
      },
    };
  }

  async doStream(
    options: Parameters<LanguageModelV1["doStream"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV1["doStream"]>>> {
    const userPrompt = this.extractUserPrompt(options.prompt);
    const self = this;

    const stream = new ReadableStream<LanguageModelV1StreamPart>({
      async start(controller) {
        try {
          const generator = self.generateMockStream(options.prompt, userPrompt);
          for await (const chunk of generator) {
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return {
      stream,
      warnings: [],
      rawCall: {
        rawPrompt: options.prompt,
        rawSettings: {},
      },
      rawResponse: { headers: {} },
    };
  }
}

class FallbackLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = "v1" as const;
  readonly provider: string;
  readonly modelId: string;
  readonly defaultObjectGenerationMode = "tool" as const;

  constructor(
    private real: LanguageModelV1,
    private fallback: MockLanguageModel
  ) {
    this.provider = real.provider;
    this.modelId = real.modelId;
  }

  private buildPrefixStream(
    prefix: string,
    original: ReadableStream<LanguageModelV1StreamPart>
  ): ReadableStream<LanguageModelV1StreamPart> {
    return new ReadableStream({
      async start(controller) {
        controller.enqueue({ type: "text-delta", textDelta: prefix });
        const reader = original.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
          controller.close();
        } catch (e) {
          controller.error(e);
        } finally {
          reader.releaseLock();
        }
      },
    });
  }

  async doStream(
    options: Parameters<LanguageModelV1["doStream"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV1["doStream"]>>> {
    try {
      return await this.real.doStream(options);
    } catch (error) {
      console.error("API error, falling back to mock:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown API error";
      const mockResult = await this.fallback.doStream(options);
      return {
        ...mockResult,
        stream: this.buildPrefixStream(
          `⚠️ API Error: ${errorMessage}. Showing demo response:\n\n`,
          mockResult.stream
        ),
      };
    }
  }

  async doGenerate(
    options: Parameters<LanguageModelV1["doGenerate"]>[0]
  ): Promise<Awaited<ReturnType<LanguageModelV1["doGenerate"]>>> {
    try {
      return await this.real.doGenerate(options);
    } catch (error) {
      console.error("API error, falling back to mock:", error);
      return await this.fallback.doGenerate(options);
    }
  }
}

export function getLanguageModel() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    console.log("No ANTHROPIC_API_KEY found, using mock provider");
    return new MockLanguageModel("mock-claude-sonnet-4-0");
  }

  return new FallbackLanguageModel(
    anthropic(MODEL),
    new MockLanguageModel("mock-claude-sonnet-4-0")
  );
}
