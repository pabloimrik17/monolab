# MCP Servers Integration with Claude Code

This document provides comprehensive research on the Model Context Protocol (MCP) and its integration with Claude Code.

## Table of Contents

1. [MCP Protocol Overview](#1-mcp-protocol-overview)
2. [Creating MCP Servers](#2-creating-mcp-servers)
3. [Tools, Resources, and Prompts](#3-tools-resources-and-prompts)
4. [Integration with Claude Code](#4-integration-with-claude-code)
5. [Best Practices](#5-best-practices)
6. [Sources](#sources)

---

## 1. MCP Protocol Overview

### What is MCP?

The Model Context Protocol (MCP) is an open standard introduced by Anthropic in November 2024 that standardizes how AI systems like large language models (LLMs) integrate with external tools, systems, and data sources. MCP provides a universal interface for reading files, executing functions, and handling contextual prompts.

MCP is inspired by the Language Server Protocol (LSP) and has become the de-facto standard for providing context to models. Major AI providers including OpenAI and Google DeepMind have adopted the protocol.

### Protocol Specification

MCP uses **JSON-RPC 2.0** as its message format for communication. The protocol operates on a stateful connection model between three key components:

| Component | Role |
|-----------|------|
| **Hosts** | LLM applications that initiate connections (e.g., Claude Code, Claude Desktop) |
| **Clients** | Connectors within the host application that manage server connections |
| **Servers** | Services that provide context, resources, and capabilities |

### Transport Mechanisms

MCP supports multiple transport layers for different deployment scenarios:

#### 1. Standard Input/Output (stdio)

- Direct process communication
- Client spawns server as a child process
- Communication via STDIN/STDOUT streams
- Ideal for local integrations
- Single client connection only

```typescript
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const transport = new StdioServerTransport();
await server.connect(transport);
```

#### 2. Streamable HTTP (Recommended for Remote)

The modern standard for remote MCP server communication:

- Single HTTP endpoint supporting POST and GET
- Supports session management with session IDs
- Can respond with JSON or SSE stream
- Supports connection resumption via Event IDs

#### 3. Server-Sent Events (SSE) - Legacy

**Deprecated as of 2025-03-26.** Uses SSE for server-to-client messages and HTTP POST for client-to-server messages.

### Protocol Lifecycle

1. **Initialization** - Handshake and capability negotiation between client and server
2. **Active Operation** - Request/response message exchange for tools, resources, prompts
3. **Termination** - Graceful connection closure

---

## 2. Creating MCP Servers

### Available SDKs

MCP provides official SDKs for multiple languages:

| Language | Repository | Package |
|----------|------------|---------|
| TypeScript | [typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk) | `@modelcontextprotocol/sdk` |
| Python | [python-sdk](https://github.com/modelcontextprotocol/python-sdk) | `mcp` |
| Go | [go-sdk](https://github.com/modelcontextprotocol/go-sdk) | - |
| Kotlin | [kotlin-sdk](https://github.com/modelcontextprotocol/kotlin-sdk) | - |
| Java | [java-sdk](https://github.com/modelcontextprotocol/java-sdk) | - |
| C# | [csharp-sdk](https://github.com/modelcontextprotocol/csharp-sdk) | - |
| Rust | [rust-sdk](https://github.com/modelcontextprotocol/rust-sdk) | - |

### TypeScript SDK Installation

```bash
npm install @modelcontextprotocol/sdk zod
```

### Basic Server Structure

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Create the server
const server = new McpServer({
  name: "my-mcp-server",
  version: "1.0.0"
});

// Register tools, resources, and prompts here...

// Connect to transport
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Python SDK Installation

```bash
pip install mcp
```

### Python Server Example

```python
from mcp.server import Server
from mcp.server.stdio import stdio_server

app = Server("example-server")

@app.tool()
async def my_tool(arg: str) -> str:
    return f"Processed: {arg}"

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())
```

---

## 3. Tools, Resources, and Prompts

MCP servers expose three primary primitives to clients:

### Tools

Tools allow LLMs to perform actions, computations, and side effects. They are similar to POST/PUT/DELETE operations in REST APIs.

```typescript
import { z } from "zod";

server.registerTool(
  "add",
  {
    title: "Addition Tool",
    description: "Add two numbers together",
    inputSchema: {
      a: z.number().describe("First number"),
      b: z.number().describe("Second number")
    }
  },
  async ({ a, b }) => ({
    content: [{ type: "text", text: String(a + b) }]
  })
);
```

### Resources

Resources expose read-only data to clients and AI models. They are similar to GET operations in REST APIs.

```typescript
server.registerResource(
  "config",
  "config://app",
  {
    title: "Application Configuration",
    description: "Current application configuration settings",
    mimeType: "application/json"
  },
  async (uri) => ({
    contents: [{
      uri: uri.href,
      text: JSON.stringify({
        version: "1.0.0",
        environment: "production"
      })
    }]
  })
);
```

### Prompts

Prompts are reusable templates that help users interact with models consistently.

```typescript
server.registerPrompt(
  "code-review",
  {
    title: "Code Review",
    description: "Generate a code review prompt for the given code",
    argsSchema: {
      code: z.string().describe("The code to review"),
      language: z.string().optional().describe("Programming language")
    }
  },
  ({ code, language }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Please review the following ${language || ""} code...`
      }
    }]
  })
);
```

---

## 4. Integration with Claude Code

### Overview

MCP servers extend Claude Code's capabilities by connecting to external APIs, databases, and services. With MCP servers connected, Claude Code can:

- Implement features from issue trackers
- Analyze monitoring data from services like Sentry
- Query databases directly
- Integrate with design tools like Figma
- Automate workflows with communication tools

### Configuration Methods

#### Method 1: CLI Commands (Recommended)

```bash
# Add HTTP server (recommended for remote)
claude mcp add --transport http notion https://mcp.notion.com/mcp

# Add HTTP server with authentication
claude mcp add --transport http secure-api https://api.example.com/mcp \
  --header "Authorization: Bearer your-token"

# Add stdio server
claude mcp add --transport stdio airtable --env AIRTABLE_API_KEY=YOUR_KEY \
  -- npx -y airtable-mcp-server

# List all servers
claude mcp list

# Remove a server
claude mcp remove github
```

#### Method 2: Direct Configuration File

Edit `~/.claude.json` directly for complex configurations:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxxxxxxxxx"
      }
    },
    "custom-http": {
      "type": "http",
      "url": "https://api.example.com/mcp",
      "headers": {
        "Authorization": "Bearer ${API_TOKEN}"
      }
    }
  }
}
```

### Installation Scopes

| Scope | Storage Location | Use Case |
|-------|------------------|----------|
| **Local** (default) | `~/.claude.json` | Personal servers, experimental configs |
| **Project** | `.mcp.json` in project root | Team collaboration, shared via version control |
| **User** | `~/.claude.json` | Personal utilities across all projects |

### Project Configuration (.mcp.json)

For team collaboration, create `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "project-db": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@bytebase/dbhub"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL:-postgresql://localhost:5432/dev}"
      }
    }
  }
}
```

Environment variable syntax:
- `${VAR}` - Expands to environment variable value
- `${VAR:-default}` - Uses default if VAR not set

### Checking Server Status

Inside Claude Code:

```bash
/mcp
```

This displays all connected MCP servers, their status, and allows OAuth authentication.

---

## 5. Best Practices

### Error Handling

#### Actionable Error Messages

Instead of generic errors, provide context that helps the agent decide what to do:

```typescript
// Bad
throw new Error("Access denied");

// Good
throw new Error(
  "Access denied: The API_TOKEN environment variable is not set or has expired. " +
  "Please configure a valid token to access this resource."
);
```

#### Retry with Exponential Backoff

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries exceeded");
}
```

### Security Model

#### Input Validation

Always validate and sanitize inputs:

```typescript
import { z } from "zod";

const FilePathSchema = z.string()
  .regex(/^[a-zA-Z0-9_\-\/\.]+$/, "Invalid file path characters")
  .refine(path => !path.includes(".."), "Path traversal not allowed")
  .refine(path => path.startsWith("/allowed/"), "Path must be in allowed directory");
```

#### Token Security

From the MCP specification:

1. **Never implement token passthrough** - Servers must NOT accept tokens not explicitly issued for them
2. **Validate token audience** - Ensure tokens are issued for your MCP server
3. **Use secure session IDs** - Generate with secure random number generators
4. **Bind sessions to user identity** - Format: `<user_id>:<session_id>`
5. **Rotate sessions** - Implement session expiration policies

#### Environment Variables for Credentials

```typescript
// Good: Use environment variables
const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error("API_KEY environment variable is required");
}

// Bad: Hardcoded credentials
const apiKey = "sk-xxxxxxxxxxxx"; // Never do this
```

### Performance Considerations

#### Tool Design

Avoid creating too many granular tools. Group related functionality:

```typescript
// Good: Consolidated tool with options
server.registerTool(
  "user",
  {
    title: "User Operations",
    description: "Get user information",
    inputSchema: {
      userId: z.string(),
      fields: z.array(z.enum(["email", "profile", "settings"])).optional()
    }
  },
  async ({ userId, fields }) => {
    const user = await getUser(userId, fields);
    return { content: [{ type: "text", text: JSON.stringify(user) }] };
  }
);
```

### Debugging

Use the MCP Inspector for visual debugging:

```bash
npx @modelcontextprotocol/inspector node /path/to/your/server.js
```

---

## Sources

### Official Documentation
- [Model Context Protocol Specification (2025-11-25)](https://modelcontextprotocol.io/specification/2025-11-25)
- [MCP SDK Documentation](https://modelcontextprotocol.io/docs/sdk)
- [Claude Code MCP Documentation](https://code.claude.com/docs/en/mcp)
- [Security Best Practices](https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices)

### SDKs and Repositories
- [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Python SDK](https://github.com/modelcontextprotocol/python-sdk)
- [Reference MCP Servers](https://github.com/modelcontextprotocol/servers)
- [@modelcontextprotocol/sdk on npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk)

### Tutorials and Guides
- [How to build MCP servers with TypeScript SDK](https://dev.to/shadid12/how-to-build-mcp-servers-with-typescript-sdk-1c28)
- [MCP Server Transports Guide](https://docs.roocode.com/features/mcp/server-transports)

---

*Research compiled: January 2026*
