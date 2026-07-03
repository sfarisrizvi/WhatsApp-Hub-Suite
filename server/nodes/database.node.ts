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

      const containerId = context.$env.containerId;
      const isTenantTable = ["orders", "contacts", "deals"].includes(tableName);

      // Auto-inject container_id to where conditions for tenant-specific tables to enforce multi-tenant isolation
      const finalWhereConditions = [...whereConditions];
      if (isTenantTable && containerId && !whereConditions.some((w: any) => w.column === "container_id" || w.column === "containerId")) {
        finalWhereConditions.push({ column: "container_id", operator: "=", value: containerId });
      }

      let sqlString = "";
      let values: any[] = [];

      if (operation === "insert") {
        if (fields.length === 0) return { status: "failed", error: "Insert requires at least one column-value pair." };
        
        // Auto-inject container_id on inserts if it is missing
        const finalFields = [...fields];
        if (isTenantTable && containerId && !fields.some((f: any) => f.column === "container_id" || f.column === "containerId")) {
          finalFields.push({ column: "container_id", value: containerId });
        }

        const keys = finalFields.map((f: any) => `"${f.column}"`).join(', ');
        const placeholders = finalFields.map((_: any, i: number) => `$${i + 1}`).join(', ');
        
        values = finalFields.map((f: any) => {
          let val = f.value;
          if (tableName === "orders" && (f.column === "items" || f.column === "metadata")) {
            if (typeof val === "string") {
              try {
                JSON.parse(val);
              } catch (e) {
                if (f.column === "items") {
                  val = JSON.stringify([val]);
                } else {
                  val = JSON.stringify({ value: val });
                }
              }
            } else if (typeof val === "object" && val !== null) {
              val = JSON.stringify(val);
            }
          }
          return val;
        });
        sqlString = `INSERT INTO "${tableName}" (${keys}) VALUES (${placeholders}) RETURNING *;`;
      } 
      else if (operation === "select") {
        sqlString = `SELECT * FROM "${tableName}"`;
        if (finalWhereConditions.length > 0) {
          const clauses = finalWhereConditions.map((w: any) => {
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
          let val = f.value;
          if (tableName === "orders" && (f.column === "items" || f.column === "metadata")) {
            if (typeof val === "string") {
              try {
                JSON.parse(val);
              } catch (e) {
                if (f.column === "items") {
                  val = JSON.stringify([val]);
                } else {
                  val = JSON.stringify({ value: val });
                }
              }
            } else if (typeof val === "object" && val !== null) {
              val = JSON.stringify(val);
            }
          }
          values.push(val);
          return `"${f.column}" = $${values.length}`;
        }).join(", ");
        sqlString += setClauses;

        if (finalWhereConditions.length > 0) {
          const clauses = finalWhereConditions.map((w: any) => {
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
        if (finalWhereConditions.length > 0) {
          const clauses = finalWhereConditions.map((w: any) => {
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
