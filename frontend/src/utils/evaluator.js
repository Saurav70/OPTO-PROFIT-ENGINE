// src/utils/evaluator.js
// General-purpose formula evaluator using mathjs.
// This utility can be used across the application to compute custom
// industrial formulas with variable substitution.

import { evaluate } from 'mathjs';

/**
 * Evaluate a mathematical expression.
 * @param {string} expression - The formula string, e.g., "a * b + c".
 * @param {Object} [scope={}] - Optional variables mapping, e.g., { a: 5, b: 2, c: 3 }.
 * @returns {number} The evaluated result.
 * @throws Will throw an error if the expression is invalid.
 */
export function evaluateFormula(expression, scope = {}) {
  try {
    // mathjs evaluate safely parses and computes the expression.
    return evaluate(expression, scope);
  } catch (error) {
    console.error('Formula evaluation error:', { expression, scope, error });
    throw error;
  }
}

// Example usage (remove or comment out in production):
// const result = evaluateFormula('a * b + c', { a: 5, b: 2, c: 3 });
// console.log('Evaluation result:', result);
