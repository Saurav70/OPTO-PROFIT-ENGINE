import { evaluate } from 'mathjs';

/**
 * Builds a data context from config variables for formula evaluation.
 */
export const buildContext = (variables, extraContext = {}) => {
  const context = {};
  if (Array.isArray(variables)) {
    variables.forEach(v => {
      context[v.key] = v.value;
    });
  }
  return { ...context, ...extraContext };
};

/**
 * Evaluates a formula string using mathjs.
 */
export const evaluateFormula = (formula, context) => {
  if (!formula) return 0;
  try {
    // mathjs handles ternary logic like (a > b) ? c : d
    const result = evaluate(formula, context);
    return typeof result === 'number' ? result : 0;
  } catch (error) {
    console.error('Formula evaluation error:', error, { formula, context });
    return 0;
  }
};

/**
 * Gets a variable object by key.
 */
export const getVariable = (variables, key) => {
  return variables?.find(v => v.key === key);
};

/**
 * Gets a variable value from the variables list.
 */
export const getVariableValue = (variables, key, fallback = 0) => {
  const v = getVariable(variables, key);
  return v ? v.value : fallback;
};

/**
 * Formats a value as Indian Currency (₹) using Lakhs and Crores scaling.
 */
// eslint-disable-next-line no-unused-vars
export const formatCurrency = (value, variables) => {
  const symbol = '₹';
  const valNum = Math.abs(value || 0);
  const sign = (value || 0) < 0 ? '-' : '';
  
  if (valNum >= 10000000) {
    return `${sign}${symbol}${(valNum / 10000000).toFixed(2)} Cr`;
  }
  if (valNum >= 100000) {
    return `${sign}${symbol}${(valNum / 100000).toFixed(2)} Lakh`;
  }
  return `${sign}${symbol}${Math.round(valNum).toLocaleString('en-IN')}`;
};
