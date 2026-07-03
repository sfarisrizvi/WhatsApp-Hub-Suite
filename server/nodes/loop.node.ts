import { BaseNodeExecutor, NodeExecutorArgs, NodeExecutionResult } from "./base.node.ts";

export class LoopNodeExecutor extends BaseNodeExecutor {
  async execute(args: NodeExecutorArgs): Promise<NodeExecutionResult> {
    const { nodeId, data, context, outgoingEdges } = args;

    const config = this.evaluateNodeData(data, context);
    
    // We expect the user to provide an array, e.g. {{ $json.items }}
    const arrayToLoop = config.sourceArray;

    if (!Array.isArray(arrayToLoop)) {
      return { status: "failed", error: "Source is not an array." };
    }

    // Initialize or fetch loop state from context
    if (!context.$node[nodeId]) {
      context.$node[nodeId] = { json: {} };
    }
    
    let loopState = context.$node[nodeId].loopState;
    if (!loopState) {
      loopState = { index: 0 };
    }

    const currentIndex = loopState.index;

    // Check if we have finished iterating
    if (currentIndex >= arrayToLoop.length) {
      // Reset loop state for future executions (if there's an outer loop)
      context.$node[nodeId].loopState = { index: 0 };
      
      const doneEdges = outgoingEdges.filter(e => e.sourceHandle === "done").map(e => e.id);
      return {
        status: "success",
        data: { finished: true, totalItems: arrayToLoop.length },
        nextEdges: doneEdges
      };
    }

    // Get current item
    const currentItem = arrayToLoop[currentIndex];

    // Increment index for the next time this node is executed (via cyclic connection)
    context.$node[nodeId].loopState = { index: currentIndex + 1 };

    const itemEdges = outgoingEdges.filter(e => e.sourceHandle === "item").map(e => e.id);

    return {
      status: "success",
      data: currentItem, // Output is the single item
      nextEdges: itemEdges
    };
  }
}
