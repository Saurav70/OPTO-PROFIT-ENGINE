// src/utils/evaluator.js
// General-purpose formula evaluator using mathjs.
// Lazy-loads mathjs to keep it out of the critical-path bundle.

let _evaluate = null;
const getEvaluate = async () => {
  if (!_evaluate) {
    const mathjs = await import('mathjs');
    _evaluate = mathjs.evaluate;
  }
  return _evaluate;
};

/**
 * Evaluate a mathematical expression (async — loads mathjs on demand).
 * @param {string} expression - The formula string, e.g., "a * b + c".
 * @param {Object} [scope={}] - Optional variables mapping, e.g., { a: 5, b: 2, c: 3 }.
 * @returns {Promise<number>} The evaluated result.
 * @throws Will throw an error if the expression is invalid.
 */
export async function evaluateFormula(expression, scope = {}) {
  try {
    const evaluate = await getEvaluate();
    // mathjs evaluate safely parses and computes the expression.
    return evaluate(expression, scope);
  } catch (error) {
    console.error('Formula evaluation error:', { expression, scope, error });
    throw error;
  }
}
