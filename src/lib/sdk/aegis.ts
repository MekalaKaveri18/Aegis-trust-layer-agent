export class Aegis {
  constructor(private readonly opts: { baseUrl: string; apiKey?: string }) {}

  private headers() {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (this.opts.apiKey) headers.authorization = `Bearer ${this.opts.apiKey}`;
    return headers;
  }

  /** Strip PII and secrets from text before it is sent to a model. */
  async minimize(text: string) {
    const res = await fetch(`${this.opts.baseUrl.replace(/\/$/, "")}/api/v1/minimize`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`Aegis minimize failed (${res.status})`);
    return (await res.json()) as {
      forModel: string;
      raw: string;
      redactedCount: number;
      findings: Array<{ class: string; count: number; action: string }>;
    };
  }

  /** Call a tool through Aegis (MCP-compatible names like gmail.read). */
  async callTool(name: string, args: Record<string, unknown> = {}) {
    const res = await fetch(`${this.opts.baseUrl.replace(/\/$/, "")}/api/v1/tools`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ name, arguments: args }),
    });
    if (!res.ok) throw new Error(`Aegis tool call failed (${res.status})`);
    return res.json();
  }
}
