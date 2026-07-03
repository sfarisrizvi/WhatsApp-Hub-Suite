import { BaseNodeExecutor, NodeExecutorArgs, NodeExecutionResult } from "./base.node.ts";

export class SetNodeExecutor extends BaseNodeExecutor {
  async execute(args: NodeExecutorArgs): Promise<NodeExecutionResult> {
    const { data, context, outgoingEdges } = args;

    const config = this.evaluateNodeData(data, context);
    
    const keepOnlySet = config.keepOnlySet || false; // If true, wipes out previous data
    const valuesToSet = config.values || []; // Array of { key: string, value: any }

    // Start with existing data or an empty object based on configuration
    const outputData: any = keepOnlySet ? {} : { ...context.$json };

    for (const item of valuesToSet) {
      if (item.key) {
        outputData[item.key] = item.value;
      }
    }

    return {
      status: "success",
      data: outputData,
      nextEdges: outgoingEdges.map(e => e.id)
    };
  }
}
