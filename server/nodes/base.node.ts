import { ExpressionContext, evaluateObject } from "../expression-parser";
import { db } from "../db";

export interface NodeExecutionResult {
  status: "success" | "failed" | "paused";
  data?: any;
  binary?: Record<string, { data: Buffer; mimeType: string; fileName: string }>;
  error?: string;
  nextEdges?: string[]; // IDs of the edges to traverse next (useful for branching)
}

export interface NodeExecutorArgs {
  nodeId: string;
  nodeType: string;
  data: Record<string, any>;
  context: ExpressionContext;
  outgoingEdges: any[]; // ReactFlow edge objects starting from this node
}

export abstract class BaseNodeExecutor {
  /**
   * Main execution function implemented by specific node types.
   */
  abstract execute(args: NodeExecutorArgs): Promise<NodeExecutionResult>;

  /**
   * Helper function to evaluate all {{ expressions }} inside node data
   */
  evaluateNodeData(data: Record<string, any>, context: ExpressionContext): Record<string, any> {
    return evaluateObject(data, context);
  }
}
