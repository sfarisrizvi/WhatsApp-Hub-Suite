import { BaseNodeExecutor, NodeExecutorArgs, NodeExecutionResult } from "./base.node.ts";

export class WaitNodeExecutor extends BaseNodeExecutor {
  async execute(args: NodeExecutorArgs): Promise<NodeExecutionResult> {
    const { data, context, outgoingEdges } = args;

    const config = this.evaluateNodeData(data, context);
    
    const duration = Number(config.duration) || 0;
    const unit = config.unit || "seconds"; // seconds, minutes, hours

    let msToWait = 0;
    switch (unit) {
      case "seconds": msToWait = duration * 1000; break;
      case "minutes": msToWait = duration * 60 * 1000; break;
      case "hours": msToWait = duration * 60 * 60 * 1000; break;
      default: msToWait = duration; // Assume ms if unknown
    }

    if (msToWait > 0) {
      return {
        status: "paused",
        data: { waitMs: msToWait },
        nextEdges: outgoingEdges.map(e => e.id)
      } as NodeExecutionResult; // We overload status for DAG engine to catch
    }

    return {
      status: "success",
      data: { waitedMs: msToWait },
      nextEdges: outgoingEdges.map(e => e.id)
    };
  }
}
