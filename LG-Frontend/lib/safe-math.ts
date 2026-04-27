/**
 * CSP-safe math expression evaluator.
 *
 * Uses a recursive descent parser to evaluate arithmetic expressions
 * containing +, -, *, /, parentheses, and numeric literals.
 *
 * This avoids eval() / new Function() which violate Content-Security-Policy.
 */

const VALID_MATH_CHARS = /^[0-9+\-*/().\s]+$/;

export function evaluateMathExpression(expr: string): number {
  if (!VALID_MATH_CHARS.test(expr)) {
    throw new Error("Invalid characters in math formula");
  }

  const cleanExpr = expr.replace(/\s+/g, "");
  let pos = 0;

  const parseExpression = (): number => {
    let v = parseTerm();
    while (pos < cleanExpr.length) {
      const c = cleanExpr[pos];
      if (c === "+") { pos++; v += parseTerm(); }
      else if (c === "-") { pos++; v -= parseTerm(); }
      else break;
    }
    return v;
  };

  const parseTerm = (): number => {
    let v = parseFactor();
    while (pos < cleanExpr.length) {
      const c = cleanExpr[pos];
      if (c === "*") { pos++; v *= parseFactor(); }
      else if (c === "/") { pos++; v /= parseFactor(); }
      else break;
    }
    return v;
  };

  const parseFactor = (): number => {
    if (cleanExpr[pos] === "(") {
      pos++;
      const v = parseExpression();
      if (cleanExpr[pos] === ")") pos++;
      return v;
    }
    const start = pos;
    while (pos < cleanExpr.length && /[\d.]/.test(cleanExpr[pos])) pos++;
    return parseFloat(cleanExpr.substring(start, pos));
  };

  return parseExpression();
}
