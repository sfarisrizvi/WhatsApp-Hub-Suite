import { db } from "./db";
import { workflows, workflowRuns, workflowNodeLogs, workflowPauses } from "../shared/schema";
import { eq, lte, and } from "drizzle-orm";
import { ExpressionContext } from "./expression-parser";
import { BaseNodeExecutor } from "./nodes/base.node";
import { HttpNodeExecutor } from "./nodes/http.node";
import { DatabaseNodeExecutor } from "./nodes/database.node";
import { IfNodeExecutor } from "./nodes/if.node";
import { SwitchNodeExecutor } from "./nodes/switch.node";
import { CodeNodeExecutor } from "./nodes/code.node";
import { LoopNodeExecutor } from "./nodes/loop.node";
import { WaitNodeExecutor } from "./nodes/wait.node";
import { SetNodeExecutor } from "./nodes/set.node";
import { ErrorNodeExecutor } from "./nodes/error.node";
import { TriggerNodeExecutor, AiNodeExecutor, MessageNodeExecutor, ActionNodeExecutor } from "./nodes/legacy.nodes";
import { CryptoNodeExecutor } from "./nodes/crypto.node";
import { CompressNodeExecutor } from "./nodes/compress.node";
import { FormatNodeExecutor } from "./nodes/format.node";

const MAX_EXECUTION_DEPTH = 50000;
const DEFAULT_NODE_TIMEOUT_MS = 30000; // 30 seconds

const NODE_REGISTRY: Record<string, BaseNodeExecutor> = {
  "triggerNode": new TriggerNodeExecutor(),
  "aiNode": new AiNodeExecutor(),
  "messageNode": new MessageNodeExecutor(),
  "actionNode": new ActionNodeExecutor(),
  "httpNode": new HttpNodeExecutor(),
  "databaseNode": new DatabaseNodeExecutor(),
  "ifNode": new IfNodeExecutor(),
  "switchNode": new SwitchNodeExecutor(),
  "codeNode": new CodeNodeExecutor(),
  "loopNode": new LoopNodeExecutor(),
  "waitNode": new WaitNodeExecutor(),
  "setNode": new SetNodeExecutor(),
  "errorNode": new ErrorNodeExecutor(),
  "cryptoNode": new CryptoNodeExecutor(),
  "compressNode": new CompressNodeExecutor(),
  "formatNode": new FormatNodeExecutor(),
};

/**
 * Helper to run a promise with a timeout.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(errorMessage)), ms);
  });
  return Promise.race([
    promise,
    timeoutPromise
  ]).finally(() => clearTimeout(timeoutHandle));
}

export async function executeWorkflow(
  workflowId: string, 
  payload: any, 
  isTestRun: boolean = false,
  resumeState?: { runId: string; context: ExpressionContext; queue: {nodeId: string}[] }
) {
  console.log(`[DAG Engine] Starting execution for Workflow ${workflowId} (Test: ${isTestRun}, Resumed: ${!!resumeState})`);

  const wf = await db.query.workflows.findFirst({ where: eq(workflows.id, workflowId) });
  if (!wf) throw new Error("Workflow not found");
  if (!wf.isActive && !isTestRun) return { status: "aborted", reason: "inactive" };

  const nodes = (wf.nodes as any[]) || [];
  const edges = (wf.edges as any[]) || [];

  let runId = resumeState?.runId || "test-run";
  if (!isTestRun && !resumeState) {
    const triggerNode = nodes.find(n => n.type === "triggerNode");
    if (!triggerNode) throw new Error("Workflow has no Trigger Node");

    const [run] = await db.insert(workflowRuns).values({
      workflowId,
      containerId: wf.containerId,
      status: "running",
      triggerPayload: payload,
    }).returning();
    runId = run.id;
  }

  // 1. Initialize Context
  const context: ExpressionContext = resumeState?.context || {
    $json: { 
      payload,                          // Full payload at $json.payload
      message: payload.message || {},   // Shortcut: $json.message.body works immediately
    },
    $node: {},          // Output data of all executed nodes
    $env: {
      containerId: wf.containerId,
      isTestRun: String(isTestRun),
      conversationId: payload.session?.thread_id || "",
    }
  };

  const executionQueue = resumeState?.queue || [{ nodeId: nodes.find(n => n.type === "triggerNode")?.id! }];
  let executionCount = 0;
  let hasFailed = false;
  let finalError = "";

  try {
    // 2. Main Traversal Loop
    while (executionQueue.length > 0) {
      if (executionCount >= MAX_EXECUTION_DEPTH) {
        throw new Error(`Max execution depth of ${MAX_EXECUTION_DEPTH} reached. Possible infinite loop detected.`);
      }

      if (executionCount % 50 === 0) {
        // Yield to event loop to prevent OOM / freezing Node.js
        await new Promise(r => setImmediate(r));
      }
      
      const currentItem = executionQueue.shift();
      if (!currentItem) continue;

      const node = nodes.find(n => n.id === currentItem.nodeId);
      if (!node) continue;

      executionCount++;
      const nodeLabel = node.data?.label || node.type;
      console.log(`[DAG Engine] Executing Node: ${nodeLabel} (${node.id})`);

      const executor = NODE_REGISTRY[node.type];
      if (!executor) {
        throw new Error(`Unsupported node type: ${node.type}`);
      }

      const outgoingEdges = edges.filter(e => e.source === node.id);
      
      const startTime = new Date();
      let nodeStatus = "success";
      let nodeError = "";
      let nodeData = {};
      let nextEdgesToFollow: string[] = [];

      try {
        const result = await withTimeout(
          executor.execute({
            nodeId: node.id,
            nodeType: node.type,
            data: node.data,
            context,
            outgoingEdges
          }),
          DEFAULT_NODE_TIMEOUT_MS,
          `Node ${nodeLabel} execution timed out after ${DEFAULT_NODE_TIMEOUT_MS}ms`
        );

        if (result.status === "paused") {
          nodeStatus = "paused";
          nodeData = result.data || {};
          nextEdgesToFollow = result.nextEdges || [];
        } else if (result.status === "failed") {
          throw new Error(result.error || "Unknown node error");
        } else {
          nodeData = result.data || {};
          if (result.binary) {
            if (!context.$binary) context.$binary = {};
            Object.assign(context.$binary, result.binary);
          }
          nextEdgesToFollow = result.nextEdges || [];
        }
        
      } catch (err: any) {
        nodeStatus = "failed";
        nodeError = err.message;
        console.error(`[DAG Engine] Node Failed: ${nodeLabel}`, nodeError);

        // Check for "Continue On Fail"
        if (!node.data?.continueOnFail) {
          const errorTrigger = nodes.find(n => n.type === "errorTriggerNode");
          if (errorTrigger) {
            console.log(`[DAG Engine] Redirecting error to Error Trigger Node (${errorTrigger.id})`);
            nodeStatus = "failed";
            nodeError = err.message;
            nodeData = { error: nodeError, failedNodeId: node.id, failedNodeLabel: nodeLabel };
            nextEdgesToFollow = [];
            executionQueue.push({ nodeId: errorTrigger.id });
          } else {
            throw err; // Stop workflow execution
          }
        } else {
          console.log(`[DAG Engine] Node ${nodeLabel} failed, but Continue On Fail is enabled.`);
          // If continue on fail is enabled, we still register the node in context so subsequent nodes can see the error
          nodeData = { error: nodeError };
        }
      }

      // 3. Save Node State to Context
      // This makes it available via {{ $node['NodeName'].json.someField }}
      context.$node[node.id] = { json: nodeData, binary: context.$binary };
      context.$node[nodeLabel] = { json: nodeData, binary: context.$binary };

      // Debug: log node output for test runs
      if (isTestRun) {
        console.log(`[DAG Engine][Test] Node "${nodeLabel}" status=${nodeStatus} output=`, JSON.stringify(nodeData).substring(0, 300));
      }

      // Update $json pointer to point to the output of the most recently executed node,
      // but preserve the original trigger properties so they are always accessible anywhere via $json
      context.$json = {
        payload: context.$json.payload || payload,
        message: context.$json.message || payload.message || {},
        contact: context.$json.contact || (context.$node[nodes.find(n => n.type === "triggerNode")?.id!]?.json as any)?.contact,
        conversation: context.$json.conversation || (context.$node[nodes.find(n => n.type === "triggerNode")?.id!]?.json as any)?.conversation,
        ...nodeData
      };

      // 4. Log Execution to DB
      if (!isTestRun) {
        await db.insert(workflowNodeLogs).values({
          runId,
          nodeId: node.id,
          status: nodeStatus,
          inputData: node.data, // or we can log evaluated config
          outputData: nodeData,
          error: nodeError || null,
          startTime,
          endTime: new Date()
        });
      }

      // 5. Queue Next Nodes or Pause
      if (nodeStatus === "paused") {
        const waitMs = (nodeData as any).waitMs || 0;
        const resumeAt = new Date(Date.now() + waitMs);
        
        if (!isTestRun) {
          await db.insert(workflowPauses).values({
            runId,
            workflowId,
            nodeId: node.id,
            resumeAt,
            context,
            nextEdges: nextEdgesToFollow
          });
          
          await db.update(workflowRuns).set({
            status: "paused"
          }).where(eq(workflowRuns.id, runId));
        }
        console.log(`[DAG Engine] Workflow paused at node ${nodeLabel}, resuming at ${resumeAt}`);
        return { status: "paused", runId };
      } else if (nodeStatus === "success") {
        for (const edgeId of nextEdgesToFollow) {
          const edge = edges.find(e => e.id === edgeId);
          if (edge) {
            executionQueue.push({ nodeId: edge.target });
          }
        }
      }
    }

    // Workflow completed successfully
    if (!isTestRun) {
      await db.update(workflowRuns).set({
        status: "completed",
        endTime: new Date(),
      }).where(eq(workflowRuns.id, runId));
    }

    // Find the bot's reply text from any node that produced sentText
    let botReplyText = "";
    for (const nodeKey of Object.keys(context.$node)) {
      const nodeJson = context.$node[nodeKey]?.json;
      if (nodeJson?.sentText) {
        console.log(`[DAG Engine] Found sentText in node "${nodeKey}": ${nodeJson.sentText.substring(0, 100)}`);
        botReplyText = nodeJson.sentText;
        break;
      }
      // Also check AI node output text
      if (nodeJson?.text && typeof nodeJson.text === "string") {
        botReplyText = nodeJson.text;
      }
    }
    if (!botReplyText) {
      console.log("[DAG Engine] No sentText or text found in any node. Executed nodes:", Object.keys(context.$node).join(", "));
    }
    const testOutputText = botReplyText || JSON.stringify(context.$json);
    return { 
      status: "success", 
      runId, 
      testOutput: testOutputText,
      botReply: botReplyText,
    };

  } catch (globalError: any) {
    console.error(`[DAG Engine] Workflow Failed:`, globalError.message);
    
    if (!isTestRun) {
      await db.update(workflowRuns).set({
        status: "failed",
        error: globalError.message,
        endTime: new Date(),
      }).where(eq(workflowRuns.id, runId));
    }
    
    throw globalError;
  }
}

export async function resumePausedWorkflows() {
  const now = new Date();
  
  const pausesToResume = await db.query.workflowPauses.findMany({
    where: and(
      lte(workflowPauses.resumeAt, now),
      eq(workflowPauses.status, "pending")
    )
  });

  if (pausesToResume.length === 0) return;
  console.log(`[DAG Engine] Found ${pausesToResume.length} paused workflows to resume.`);

  for (const pause of pausesToResume) {
    try {
      await db.update(workflowPauses)
        .set({ status: "resumed" })
        .where(eq(workflowPauses.id, pause.id));
        
      await db.update(workflowRuns).set({ status: "running" }).where(eq(workflowRuns.id, pause.runId));

      const queue = (pause.nextEdges as string[]).map(edgeId => edgeId);
      
      const wf = await db.query.workflows.findFirst({ where: eq(workflows.id, pause.workflowId) });
      const edges = (wf?.edges as any[]) || [];
      const executionQueue = queue.map(edgeId => {
        const edge = edges.find(e => e.id === edgeId);
        return edge ? { nodeId: edge.target } : null;
      }).filter(Boolean) as { nodeId: string }[];

      // Resume execution in background
      executeWorkflow(pause.workflowId, null, false, {
        runId: pause.runId,
        context: pause.context as ExpressionContext,
        queue: executionQueue
      }).catch(err => console.error("[DAG Engine Resume Error]", err));

    } catch (err) {
      console.error(`[DAG Engine] Failed to resume pause ${pause.id}`, err);
    }
  }
}
