import { BaseNodeExecutor, NodeExecutorArgs, NodeExecutionResult } from "./base.node.ts";

export class HttpNodeExecutor extends BaseNodeExecutor {
  async execute(args: NodeExecutorArgs): Promise<NodeExecutionResult> {
    const { data, context, outgoingEdges } = args;

    // 1. Evaluate all expressions in the node config
    const config = this.evaluateNodeData(data, context);

    const urlStr = config.url || "";
    const method = (config.method || "GET").toUpperCase();
    const headers = config.headers || {};
    const queryParams = config.queryParams || {};
    const body = config.body;

    // 2. Validate URL & SSRF Protection
    if (!urlStr) {
      return { status: "failed", error: "URL is required" };
    }

    try {
      const parsedUrl = new URL(urlStr);
      
      // Append query parameters
      Object.entries(queryParams).forEach(([key, val]) => {
        if (key && val !== undefined) {
          parsedUrl.searchParams.append(key, String(val));
        }
      });

      // SSRF Block List Check (Localhost, AWS Metadata, Private IPs)
      const hostname = parsedUrl.hostname;
      const isPrivateIP = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|169\.254\.|localhost)/.test(hostname);
      
      if (isPrivateIP && process.env.NODE_ENV === "production") {
        return { status: "failed", error: "Access to private/internal IP addresses is forbidden." };
      }

      // 3. Execute Fetch
      const fetchOptions: RequestInit = {
        method,
        headers,
      };

      if (body && ["POST", "PUT", "PATCH"].includes(method)) {
        if (typeof body === "object") {
          fetchOptions.body = JSON.stringify(body);
          if (!headers["Content-Type"]) {
            fetchOptions.headers = { ...headers, "Content-Type": "application/json" };
          }
        } else {
          fetchOptions.body = String(body);
        }
      }

      const response = await fetch(parsedUrl.toString(), fetchOptions);
      
      // 4. Payload Size Limit Check (10MB limit based on Content-Length)
      const contentLength = response.headers.get("content-length");
      if (contentLength && parseInt(contentLength, 10) > 10 * 1024 * 1024) {
        return { status: "failed", error: "Response payload exceeds 10MB limit." };
      }

      let responseData: any;
      const contentType = response.headers.get("content-type") || "";
      
      if (contentType.includes("application/json")) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(responseData)}`);
      }

      // Default routing: continue down all connected edges
      const nextEdges = outgoingEdges.map(e => e.id);

      return {
        status: "success",
        data: {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseData,
        },
        nextEdges
      };

    } catch (err: any) {
      return { status: "failed", error: err.message };
    }
  }
}
