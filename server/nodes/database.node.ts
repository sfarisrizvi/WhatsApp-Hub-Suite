import { BaseNodeExecutor, NodeExecutorArgs, NodeExecutionResult } from "./base.node.ts";
import { db, pool } from "../db";
import { sql } from "drizzle-orm";

export class DatabaseNodeExecutor extends BaseNodeExecutor {
  async execute(args: NodeExecutorArgs): Promise<NodeExecutionResult> {
    const { data, context, outgoingEdges } = args;
    const config = this.evaluateNodeData(data, context);
    
    const queryType = config.queryType || "structured"; 
    const rawQuery = config.rawQuery || "";

    try {
      if (queryType === "raw") {
        if (!rawQuery) {
          return { status: "failed", error: "Raw query is empty." };
        }
        const rawSql = sql.raw(rawQuery);
        const result = await db.execute(rawSql);
        return {
          status: "success",
          data: result,
          nextEdges: outgoingEdges.map(e => e.id)
        };
      }

      // Structured Query Type
      const operation = config.operation || "select";
      const tableName = config.tableName;
      const fields = config.fields || []; // Array of { column: string, value: any }
      const whereConditions = config.whereConditions || []; // Array of { column: string, operator: string, value: any }

      const allowedTables = ["contacts", "orders", "deals", "messages", "templates", "workflow_pauses", "workflow_runs", "workflows"];
      if (!tableName || !allowedTables.includes(tableName)) {
        return { status: "failed", error: `Invalid or missing table name: ${tableName}` };
      }

      let sqlString = "";
      let values: any[] = [];

      if (operation === "insert") {
        if (fields.length === 0) return { status: "failed", error: "Insert requires at least one column-value pair." };
        const keys = fields.map((f: any) => `"${f.column}"`).join(', ');
        const placeholders = fields.map((_: any, i: number) => `$${i + 1}`).join(', ');
        values = fields.map((f: any) => f.value);
        sqlString = `INSERT INTO "${tableName}" (${keys}) VALUES (${placeholders}) RETURNING *;`;
      } 
      else if (operation === "select") {
        sqlString = `SELECT * FROM "${tableName}"`;
        if (whereConditions.length > 0) {
          const clauses = whereConditions.map((w: any) => {
            values.push(w.value);
            const op = ["=", "!=", "<", ">", "<=", ">="].includes(w.operator) ? w.operator : "=";
            return `"${w.column}" ${op} $${values.length}`;
          }).join(" AND ");
          sqlString += ` WHERE ${clauses}`;
        }
        sqlString += ";";
      } 
      else if (operation === "update") {
        if (fields.length === 0) return { status: "failed", error: "Update requires fields to modify." };
        sqlString = `UPDATE "${tableName}" SET `;
        
        const setClauses = fields.map((f: any) => {
          values.push(f.value);
          return `"${f.column}" = $${values.length}`;
        }).join(", ");
        sqlString += setClauses;

        if (whereConditions.length > 0) {
          const clauses = whereConditions.map((w: any) => {
            values.push(w.value);
            const op = ["=", "!=", "<", ">", "<=", ">="].includes(w.operator) ? w.operator : "=";
            return `"${w.column}" ${op} $${values.length}`;
          }).join(" AND ");
          sqlString += ` WHERE ${clauses}`;
        }
        sqlString += " RETURNING *;";
      } 
      else if (operation === "delete") {
        sqlString = `DELETE FROM "${tableName}"`;
        if (whereConditions.length > 0) {
          const clauses = whereConditions.map((w: any) => {
            values.push(w.value);
            const op = ["=", "!=", "<", ">", "<=", ">="].includes(w.operator) ? w.operator : "=";
            return `"${w.column}" ${op} $${values.length}`;
          }).join(" AND ");
          sqlString += ` WHERE ${clauses}`;
        } else {
          return { status: "failed", error: "Unconditional deletes are blocked for safety." };
        }
        sqlString += " RETURNING *;";
      } 
      else {
        return { status: "failed", error: `Unsupported database operation: ${operation}` };
      }

      console.log(`[Database Node] Executing structured SQL: ${sqlString} with values:`, values);
      const queryResult = await pool.query(sqlString, values);

      return {
        status: "success",
        data: queryResult.rows,
        nextEdges: outgoingEdges.map(e => e.id)
      };

    } catch (err: any) {
      return { status: "failed", error: `Database structured execution failed: ${err.message}` };
    }
  }
}
