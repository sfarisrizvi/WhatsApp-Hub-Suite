import { BaseNodeExecutor, NodeExecutorArgs, NodeExecutionResult } from "./base.node.ts";

export class IfNodeExecutor extends BaseNodeExecutor {
  async execute(args: NodeExecutorArgs): Promise<NodeExecutionResult> {
    const { data, context, outgoingEdges } = args;

    const config = this.evaluateNodeData(data, context);
    
    const value1 = config.value1;
    const value2 = config.value2;
    const operator = config.operator || "===";

    let conditionMet = false;

    switch (operator) {
      case "===":
      case "==":
      case "equals":
        conditionMet = String(value1) === String(value2);
        break;
      case "!==":
      case "!=":
      case "not_equals":
        conditionMet = String(value1) !== String(value2);
        break;
      case ">":
        conditionMet = Number(value1) > Number(value2);
        break;
      case "<":
        conditionMet = Number(value1) < Number(value2);
        break;
      case ">=":
        conditionMet = Number(value1) >= Number(value2);
        break;
      case "<=":
        conditionMet = Number(value1) <= Number(value2);
        break;
      case "contains":
        conditionMet = String(value1).includes(String(value2));
        break;
      case "exists":
        conditionMet = value1 !== undefined && value1 !== null && value1 !== "";
        break;
      default:
        return { status: "failed", error: `Unknown operator: ${operator}` };
    }

    // Determine which edge to follow based on condition
    // We expect the ReactFlow edges connected to this node to have a sourceHandle
    // like "true" or "false" (or we can use edge.data.condition)
    const trueEdges = outgoingEdges.filter(e => e.sourceHandle === "true").map(e => e.id);
    const falseEdges = outgoingEdges.filter(e => e.sourceHandle === "false").map(e => e.id);

    return {
      status: "success",
      data: { result: conditionMet },
      nextEdges: conditionMet ? trueEdges : falseEdges
    };
  }
}
