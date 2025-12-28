import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {z} from "zod";
import dns from 'node:dns';
import {promisify} from 'node:util';
// Downloaded from https://tld-list.com/free-downloads
import tlds from "./tld-list.json" with {type: "json"};

// Promisify DNS functions for async/await usage
const resolveSoa = promisify(dns.resolveSoa);
const resolveNs = promisify(dns.resolveNs);

// Create server instance
const server = new McpServer({
    name: "domain-check",
    version: "1.0.0",
});

// Helper functions
export async function checkDomainExists(domain: string): Promise<boolean> {
    try {
        // Try SOA first (most reliable)
        await resolveSoa(domain);
        return true;
    } catch {
        try {
            // Try NS records as fallback
            await resolveNs(domain);
            return true;
        } catch {
            return false;
        }
    }
}

// Register domain tools
server.registerTool(
    "get_domain_availability",
    {
        description: "Get domain availability, returns whether domain is available.",
        inputSchema: {
            domain: z
                .string()
                .regex(
                    /^[a-zA-Z0-9-]{0,61}\.[a-zA-Z]{2,}$/,
                    "Invalid domain name"
                ).describe("Domain name including TLD"),
        },
    },
    async ({domain}) => {
        const available = !await checkDomainExists(domain);

        return {
            content: [
                {
                    type: "text",
                    text: available ? "yes" : "no",
                },
            ],
        };

    },
);

server.registerTool(
    "get_tld_list",
    {
        description: "Get a complete list of all TLDs",
    },
    () => {
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(tlds),
                },
            ],
        };

    },
);


async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Domain MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});