import { BaseNodeExecutor, NodeExecutorArgs, NodeExecutionResult } from "./base.node.ts";
import { getQuickJS } from "quickjs-emscripten";

export class CodeNodeExecutor extends BaseNodeExecutor {
  async execute(args: NodeExecutorArgs): Promise<NodeExecutionResult> {
    const { data, context, outgoingEdges } = args;

    const code = data.code || "return { hello: 'world' };";

    try {
      const QuickJS = await getQuickJS();
      // Create a heavily sandboxed WASM V8-equivalent environment
      const vm = QuickJS.newContext();
      
      try {
        // Prepare context data to inject
        const injectedContext = {
          $json: context.$json || {},
          $node: context.$node || {},
          $env: context.$env || {}
        };

        // Inject the $json and $node variables into the global object
        const contextHandle = vm.newString(JSON.stringify(injectedContext));
        const parseResult = vm.evalCode(`JSON.parse(${JSON.stringify(JSON.stringify(injectedContext))})`);
        
        if (parseResult.error) {
          throw new Error("Failed to parse context into QuickJS.");
        }
        
        vm.setProp(vm.global, "context", parseResult.value);
        parseResult.value.dispose();
        contextHandle.dispose();

        // Wrap the user's code to map context variables and run their code.
        // QuickJS doesn't inherently support top-level await in evalCode gracefully without extra wiring,
        // but we'll execute it sequentially.
        const wrappedCode = `
          (function() {
            var $json = context.$json;
            var $node = context.$node;
            var $env = context.$env;
            
            var userFunc = function() {
              ${code}
            };
            
            return userFunc();
          })();
        `;

        const resultHandle = vm.evalCode(wrappedCode);

        if (resultHandle.error) {
          const errorMsg = vm.dump(resultHandle.error);
          resultHandle.error.dispose();
          throw new Error(errorMsg as string);
        }

        const resultValue = vm.dump(resultHandle.value);
        resultHandle.value.dispose();

        return {
          status: "success",
          data: resultValue,
          nextEdges: outgoingEdges.map(e => e.id)
        };

      } finally {
        vm.dispose();
      }

    } catch (err: any) {
      return { status: "failed", error: `Code Execution Error: ${err.message}` };
    }
  }
}
