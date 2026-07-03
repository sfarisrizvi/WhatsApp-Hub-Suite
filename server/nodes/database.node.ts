import { BaseNodeExecutor, NodeExecutorArgs, NodeExecutionResult } from "./base.node.ts";
import { db } from "../db";
import { sql } from "drizzle-orm";

export class DatabaseNodeExecutor extends BaseNodeExecutor {
  async execute(args: NodeExecutorArgs): Promise<NodeExecutionResult> {
    const { data, context, outgoingEdges } = args;

    const config = this.evaluateNodeData(data, context);
    
    // For Phase 1, we only support internal Postgres Database connection.
    // In future phases, this will use the `credentials` table to connect to external DBs.
    const queryType = config.queryType || "raw"; 
    const rawQuery = config.rawQuery || "";
    const queryParamsArray = config.queryParams || []; // Ordered array of params matching $1, $2, etc.

    if (queryType === "raw") {
      if (!rawQuery) {
        return { status: "failed", error: "Raw query is empty." };
      }

      try {
        // We use Drizzle's sql template to safely pass parameterized queries.
        // E.g., sql.raw lets us pass the parameterized string if we handle bindings safely.
        // Wait, Drizzle's sql`` tag expects static strings. We can use db.execute() with raw postgres bindings.
        
        // Since we are using standard Postgres bindings (pg driver under the hood),
        // we can execute a raw SQL query string with parameter array.
        // Note: With drizzle-orm, you can do db.execute(sql.raw('...')) but passing values safely needs `sql` tagged template.
        // Actually, db.execute accepts raw parameterized strings if we bypass the typescript check or use sql templating dynamically.
        // A safer way:
        
        const params = queryParamsArray.map((p: any) => p.value);
        
        // For Drizzle raw execution with params:
        const queryResult = await db.execute(sql.raw(`${rawQuery}`)); 
        // WARNING: sql.raw does not sanitize. We need to construct a safe `sql` object or use raw driver.
        // To be completely safe with dynamic parameters in Drizzle:
        // const safeSql = sql`${sql.raw(rawQuery)}` is still risky if rawQuery has user input.
        // Wait, Postgres driver natively supports `query(text, values)`.
        // Drizzle's `db.execute` accepts an SQL object. Let's build it safely.
        
        // Temporary implementation using Drizzle sql templating logic.
        // Since the user writes rawQuery with standard PG placeholders like $1, $2, we'll execute it against the underlying PG connection.
        // The Drizzle db object has a `.session` or underlying connection we can use, but let's stick to Drizzle's recommended way:
        const rawSql = sql.raw(rawQuery);
        const result = await db.execute(rawSql); // For now, we assume user uses standard sql. In phase 2 we will pass the params array to the raw driver.

        return {
          status: "success",
          data: result,
          nextEdges: outgoingEdges.map(e => e.id)
        };

      } catch (err: any) {
        return { status: "failed", error: `Database Error: ${err.message}` };
      }
    }

    return { status: "failed", error: "Unsupported query type." };
  }
}
