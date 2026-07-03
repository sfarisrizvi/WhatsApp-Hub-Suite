import vm from 'vm';

export interface ExpressionContext {
  $json: Record<string, any>;
  $binary?: Record<string, { data: Buffer; mimeType: string; fileName: string }>;
  $node: Record<string, { json: Record<string, any>; binary?: Record<string, { data: Buffer; mimeType: string; fileName: string }>; loopState?: any }>;
  $env: Record<string, string | undefined>;
}

/**
 * Evaluates a string containing {{ ... }} expressions against the provided context.
 * If the string contains only one expression and nothing else (e.g., "{{ $json.items }}"),
 * it will return the actual evaluated object (array, object, boolean, etc.).
 * Otherwise, it will replace the expressions inline and return a concatenated string.
 */
export function evaluateExpression(input: string, context: ExpressionContext): any {
  if (typeof input !== 'string') return input;

  const regex = /\{\{(.*?)\}\}/g;
  
  // Check if the entire string is exactly one expression
  const exactMatch = input.match(/^\{\{(.*?)\}\}$/);
  if (exactMatch) {
    const expression = exactMatch[1].trim();
    return executeInContext(expression, context);
  }

  // Otherwise, replace inline and return as string
  return input.replace(regex, (match, expression) => {
    try {
      const result = executeInContext(expression.trim(), context);
      if (typeof result === 'object') {
        return JSON.stringify(result);
      }
      return String(result);
    } catch (err: any) {
      console.warn(`[ExpressionEvaluator] Failed to evaluate: ${expression}`, err.message);
      return match; // Return original string on failure
    }
  });
}

function executeInContext(expression: string, context: ExpressionContext): any {
  // Create a secure(ish) sandbox with the provided context
  const sandbox = {
    $json: context.$json || {},
    $node: context.$node || {},
    $env: context.$env || {},
  };

  vm.createContext(sandbox);

  try {
    const script = new vm.Script(`(${expression})`);
    return script.runInContext(sandbox);
  } catch (err: any) {
    // If it fails as an expression, it might be an assignment or complex block.
    // Try without wrapping in parentheses
    try {
      const script = new vm.Script(expression);
      return script.runInContext(sandbox);
    } catch (fallbackErr: any) {
      throw new Error(`Execution error: ${fallbackErr.message}`);
    }
  }
}

/**
 * Recursively evaluate all strings within an object/array.
 */
export function evaluateObject(obj: any, context: ExpressionContext): any {
  if (typeof obj === 'string') {
    return evaluateExpression(obj, context);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => evaluateObject(item, context));
  }
  
  if (obj !== null && typeof obj === 'object') {
    const newObj: any = {};
    for (const key of Object.keys(obj)) {
      newObj[key] = evaluateObject(obj[key], context);
    }
    return newObj;
  }
  
  return obj;
}
