import { BaseNodeExecutor, NodeExecutorArgs, NodeExecutionResult } from "./base.node";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

export class FormatNodeExecutor extends BaseNodeExecutor {
  async execute(args: NodeExecutorArgs): Promise<NodeExecutionResult> {
    const { data, context, outgoingEdges } = args;
    const config = this.evaluateNodeData(data, context);

    const operation = config.operation || "jsonToCsv";
    const inputData = config.data;
    const outputProperty = config.outputProperty || "formattedResult";

    try {
      let resultValue: any = null;

      if (operation === "jsonToCsv") {
        if (!Array.isArray(inputData)) {
          throw new Error("Input data for JSON to CSV must be an array of objects.");
        }
        resultValue = stringify(inputData, { header: true });
      } 
      else if (operation === "csvToJson") {
        if (typeof inputData !== "string") {
          throw new Error("Input data for CSV to JSON must be a string.");
        }
        resultValue = parse(inputData, {
          columns: true,
          skip_empty_lines: true,
        });
      } 
      else if (operation === "base64Encode") {
        const text = typeof inputData === "string" ? inputData : JSON.stringify(inputData);
        resultValue = Buffer.from(text, "utf8").toString("base64");
      } 
      else if (operation === "base64Decode") {
        if (typeof inputData !== "string") throw new Error("Input data for Base64 Decode must be a string.");
        const decoded = Buffer.from(inputData, "base64").toString("utf8");
        try {
          // Attempt to parse as JSON, fallback to string
          resultValue = JSON.parse(decoded);
        } catch {
          resultValue = decoded;
        }
      } 
      else {
        throw new Error(`Unknown formatting operation: ${operation}`);
      }

      return {
        status: "success",
        data: { [outputProperty]: resultValue },
        nextEdges: outgoingEdges.map((e) => e.id),
      };
    } catch (err: any) {
      return {
        status: "failed",
        error: `Format operation failed: ${err.message}`,
      };
    }
  }
}
