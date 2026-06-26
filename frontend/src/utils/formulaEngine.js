// Lazy-load mathjs to keep it out of the critical-path bundle (~665 KiB).
// The first call to getEvaluate() triggers the dynamic import; subsequent
// calls reuse the cached reference.
let _evaluate = null;
const getEvaluate = async () => {
  if (!_evaluate) {
    const mathjs = await import('mathjs');
    _evaluate = mathjs.evaluate;
  }
  return _evaluate;
};

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
 * Evaluates a formula string using mathjs (async — loads mathjs on demand).
 */
export const evaluateFormula = async (formula, context) => {
  if (!formula) return 0;
  try {
    const evaluate = await getEvaluate();
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
