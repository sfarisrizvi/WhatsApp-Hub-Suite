import { BaseNodeExecutor, NodeExecutorArgs, NodeExecutionResult } from "./base.node.ts";

export class SwitchNodeExecutor extends BaseNodeExecutor {
  async execute(args: NodeExecutorArgs): Promise<NodeExecutionResult> {
    const { data, context, outgoingEdges } = args;

    // Evaluate expressions in the rules
    const config = this.evaluateNodeData(data, context);
    const rules = config.rules || []; // Array of { value1, operator, value2, handleName }

    let matchedHandle = "default";

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      const v1 = rule.value1;
      const v2 = rule.value2;
      const op = rule.operator || "===";
      let conditionMet = false;

      switch (op) {
        case "===":
        case "==":
          conditionMet = String(v1 ?? "").toLowerCase() === String(v2 ?? "").toLowerCase();
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
          conditionMet = String(v1).toLowerCase().includes(String(v2).toLowerCase());
          break;
        case "exists":
          conditionMet = v1 !== undefined && v1 !== null && v1 !== "" && v1 !== "undefined";
          break;
      }

      if (conditionMet) {
        // Use handleName if set, otherwise fall back to rule index ("0", "1", ...) to match edge sourceHandles
        matchedHandle = (rule.handleName !== undefined && rule.handleName !== null && String(rule.handleName) !== "undefined")
          ? String(rule.handleName)
          : String(i);
        break;
      }
    }

    // Match edges by string coercion of sourceHandle
    const nextEdges = outgoingEdges.filter(e => String(e.sourceHandle) === String(matchedHandle)).map(e => e.id);

    return {
      status: "success",
      data: { matchedHandle },
      nextEdges
    };
  }
}
