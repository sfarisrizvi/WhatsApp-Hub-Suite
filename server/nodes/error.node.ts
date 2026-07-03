import { BaseNodeExecutor, NodeExecutorArgs, NodeExecutionResult } from "./base.node.ts";

export class ErrorNodeExecutor extends BaseNodeExecutor {
  async execute(args: NodeExecutorArgs): Promise<NodeExecutionResult> {
    const { data, context, outgoingEdges } = args;

    const config = this.evaluateNodeData(data, context);
    
    // Check if the previous node explicitly passed an error into the context via "Continue on Fail"
    const errorMsg = context.$json.error;
    const hasError = !!errorMsg;

    let caught = false;
    if (hasError) {
      if (config.catchType === "specific" && config.errorName) {
        caught = String(errorMsg).includes(config.errorName);
      } else {
        caught = true; // "all"
      }
    }

    const errorEdges = outgoingEdges.filter(e => e.sourceHandle === "error").map(e => e.id);
    const successEdges = outgoingEdges.filter(e => e.sourceHandle === "success").map(e => e.id);

    let outputData: any = { hasError, errorDetails: errorMsg || null };

    if (caught && config.fallback) {
      outputData = { ...outputData, fallback_applied: true, ...config.fallback };
    }

    return {
      status: "success",
      data: outputData,
      nextEdges: caught ? errorEdges : successEdges
    };
  }
}
