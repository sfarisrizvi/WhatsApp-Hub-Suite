import { BaseNodeExecutor, NodeExecutorArgs, NodeExecutionResult } from "./base.node.ts";

export class SwitchNodeExecutor extends BaseNodeExecutor {
  async execute(args: NodeExecutorArgs): Promise<NodeExecutionResult> {
    const { data, context, outgoingEdges } = args;

    // Evaluate expressions in the rules
    const config = this.evaluateNodeData(data, context);
    const rules = config.rules || []; // Array of { value1, operator, value2, handleName }

    let matchedHandle = "default";

    for (const rule of rules) {
      const v1 = rule.value1;
      const v2 = rule.value2;
      const op = rule.operator || "===";
      let conditionMet = false;

      switch (op) {
        case "===":
        case "==":
          conditionMet = String(v1) === String(v2);
          break;
        case "!==":
        case "!=":
          conditionMet = String(v1) !== String(v2);
          break;
        case ">":
          conditionMet = Number(v1) > Number(v2);
          break;
        case "<":
          conditionMet = Number(v1) < Number(v2);
          break;
        case ">=":
          conditionMet = Number(v1) >= Number(v2);
          break;
        case "<=":
          conditionMet = Number(v1) <= Number(v2);
          break;
        case "contains":
          conditionMet = String(v1).includes(String(v2));
          break;
        case "exists":
          conditionMet = v1 !== undefined && v1 !== null && v1 !== "";
          break;
      }

      if (conditionMet) {
        matchedHandle = rule.handleName;
        break; // First match wins
      }
    }

    const nextEdges = outgoingEdges.filter(e => e.sourceHandle === matchedHandle).map(e => e.id);

    return {
      status: "success",
      data: { matchedHandle },
      nextEdges
    };
  }
}
