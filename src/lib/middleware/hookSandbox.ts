/**
 * Hook Middleware Execution Sandbox
 *
 * Dependency-free, safe sandbox environment for pre-request hooks.
 * Replaces legacy `new Function(...)` / `eval(...)` compilation to eliminate
 * the residual process RCE surface and comply with Hard Rule #3.
 *
 * Security Invariants:
 * 1. Zero evaluation via `new Function`, `eval`, or `Function` constructor.
 * 2. Strict isolation: no access to `process`, `require`, `globalThis`, `window`,
 *    `global`, `Buffer`, `fetch`, `__proto__`, `constructor`, or `prototype`.
 * 3. Execution step limiter (max 5,000 steps) to prevent CPU starvation / infinite loops.
 * 4. Dual execution engine:
 *    - JSON Rule DSL: `{ match: { ... }, action: { ... } }`
 *    - Restricted AST Sandbox: safe subset of JavaScript statements and expressions.
 */

import type { HookMiddleware, PreRequestHookContext, HookResult } from "./types";

// ── Security Constraints ──────────────────────────────────────────────────

const FORBIDDEN_IDENTIFIERS = new Set([
  "process",
  "require",
  "globalThis",
  "global",
  "window",
  "eval",
  "Function",
  "constructor",
  "prototype",
  "__proto__",
  "import",
  "export",
  "fetch",
  "XMLHttpRequest",
  "Buffer",
  "setTimeout",
  "setInterval",
  "setImmediate",
]);

const MAX_EXECUTION_STEPS = 5000;

export class HookSandboxSecurityError extends Error {
  constructor(message: string) {
    super(`[HookSandboxSecurityError] ${message}`);
    this.name = "HookSandboxSecurityError";
  }
}

// ── JSON Rule DSL Support ─────────────────────────────────────────────────

interface JsonDslMatch {
  model?: string;
  combo?: string;
  headerName?: string;
  headerValue?: string;
}

interface JsonDslAction {
  model?: string;
  combo?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string | string[] | undefined>;
  response?: { status: number; body: Record<string, unknown> };
  skipRemaining?: boolean;
}

interface JsonDslRule {
  match?: JsonDslMatch;
  action?: JsonDslAction;
}

function parseJsonDsl(code: string): JsonDslRule[] | null {
  const trimmed = code.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    const rules: JsonDslRule[] = Array.isArray(parsed) ? parsed : [parsed];
    return rules;
  } catch {
    return null;
  }
}

function executeJsonDslRules(
  rules: JsonDslRule[],
  context: PreRequestHookContext
): HookResult {
  for (const rule of rules) {
    if (!rule.action) continue;

    let matches = true;
    if (rule.match) {
      if (rule.match.model && context.model !== rule.match.model) {
        matches = false;
      }
      if (rule.match.combo && context.combo !== rule.match.combo) {
        matches = false;
      }
      if (rule.match.headerName) {
        const val = context.headers[rule.match.headerName.toLowerCase()];
        if (rule.match.headerValue && val !== rule.match.headerValue) {
          matches = false;
        }
      }
    }

    if (matches) {
      return {
        model: rule.action.model,
        combo: rule.action.combo,
        body: rule.action.body,
        headers: rule.action.headers,
        response: rule.action.response,
        skipRemaining: rule.action.skipRemaining,
      };
    }
  }
  return {};
}

// ── Lightweight Tokenizer & AST Parser ───────────────────────────────────

type TokenType =
  | "KEYWORD"
  | "IDENTIFIER"
  | "STRING"
  | "NUMBER"
  | "BOOLEAN"
  | "NULL"
  | "OPERATOR"
  | "PUNCT"
  | "EOF";

interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < code.length) {
    const char = code[pos];

    // Whitespace & comments
    if (/\s/.test(char)) {
      pos++;
      continue;
    }

    if (char === "/" && code[pos + 1] === "/") {
      pos += 2;
      while (pos < code.length && code[pos] !== "\n") pos++;
      continue;
    }

    if (char === "/" && code[pos + 1] === "*") {
      pos += 2;
      while (pos < code.length && !(code[pos] === "*" && code[pos + 1] === "/")) pos++;
      pos += 2;
      continue;
    }

    // String literals
    if (char === '"' || char === "'" || char === "`") {
      const quote = char;
      let str = "";
      pos++;
      while (pos < code.length && code[pos] !== quote) {
        if (code[pos] === "\\") {
          pos++;
          if (pos < code.length) {
            const esc = code[pos];
            str += esc === "n" ? "\n" : esc === "t" ? "\t" : esc;
          }
        } else {
          str += code[pos];
        }
        pos++;
      }
      pos++; // skip closing quote
      tokens.push({ type: "STRING", value: str, pos });
      continue;
    }

    // Numbers
    if (/[0-9]/.test(char)) {
      let num = "";
      while (pos < code.length && /[0-9.]/.test(code[pos])) {
        num += code[pos];
        pos++;
      }
      tokens.push({ type: "NUMBER", value: num, pos });
      continue;
    }

    // Identifiers & Keywords
    if (/[a-zA-Z_$]/.test(char)) {
      let id = "";
      while (pos < code.length && /[a-zA-Z0-9_$]/.test(code[pos])) {
        id += code[pos];
        pos++;
      }

      if (FORBIDDEN_IDENTIFIERS.has(id)) {
        throw new HookSandboxSecurityError(`Access to identifier '${id}' is strictly forbidden`);
      }

      if (["if", "else", "return", "const", "let", "var", "while"].includes(id)) {
        tokens.push({ type: "KEYWORD", value: id, pos });
      } else if (id === "true" || id === "false") {
        tokens.push({ type: "BOOLEAN", value: id, pos });
      } else if (id === "null") {
        tokens.push({ type: "NULL", value: id, pos });
      } else {
        tokens.push({ type: "IDENTIFIER", value: id, pos });
      }
      continue;
    }

    // Operators
    const multiOps = ["===", "!==", "==", "!=", "<=", ">=", "&&", "||"];
    let matchedOp = "";
    for (const op of multiOps) {
      if (code.startsWith(op, pos)) {
        matchedOp = op;
        break;
      }
    }
    if (matchedOp) {
      tokens.push({ type: "OPERATOR", value: matchedOp, pos });
      pos += matchedOp.length;
      continue;
    }

    if (["=", "+", "-", "!", "<", ">", "."].includes(char)) {
      tokens.push({ type: "OPERATOR", value: char, pos });
      pos++;
      continue;
    }

    // Punctuation
    if (["{", "}", "(", ")", "[", "]", ";", ",", ":"].includes(char)) {
      tokens.push({ type: "PUNCT", value: char, pos });
      pos++;
      continue;
    }

    throw new HookSandboxSecurityError(`Unexpected character '${char}' at position ${pos}`);
  }

  tokens.push({ type: "EOF", value: "", pos });
  return tokens;
}

// ── AST Node Definitions ──────────────────────────────────────────────────

type ASTNode =
  | { type: "BlockStatement"; body: ASTNode[] }
  | { type: "IfStatement"; test: ASTNode; consequent: ASTNode; alternate?: ASTNode }
  | { type: "WhileStatement"; test: ASTNode; body: ASTNode }
  | { type: "ReturnStatement"; argument?: ASTNode }
  | { type: "VariableDeclaration"; kind: "const" | "let" | "var"; name: string; init: ASTNode }
  | { type: "ExpressionStatement"; expression: ASTNode }
  | { type: "AssignmentExpression"; left: ASTNode; right: ASTNode }
  | { type: "BinaryExpression"; operator: string; left: ASTNode; right: ASTNode }
  | { type: "UnaryExpression"; operator: string; argument: ASTNode }
  | { type: "MemberExpression"; object: ASTNode; property: ASTNode; computed: boolean }
  | { type: "CallExpression"; callee: ASTNode; arguments: ASTNode[] }
  | { type: "ObjectExpression"; properties: { key: string; value: ASTNode }[] }
  | { type: "ArrayExpression"; elements: ASTNode[] }
  | { type: "Identifier"; name: string }
  | { type: "Literal"; value: any };

class Parser {
  private tokens: Token[];
  private idx = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.idx] || { type: "EOF", value: "", pos: 0 };
  }

  private consume(): Token {
    const tok = this.peek();
    this.idx++;
    return tok;
  }

  private match(type: TokenType, val?: string): boolean {
    const tok = this.peek();
    if (tok.type !== type) return false;
    if (val !== undefined && tok.value !== val) return false;
    return true;
  }

  private expect(type: TokenType, val?: string): Token {
    const tok = this.peek();
    if (!this.match(type, val)) {
      throw new HookSandboxSecurityError(
        `Parse error: expected ${type} '${val ?? ""}', got ${tok.type} '${tok.value}'`
      );
    }
    return this.consume();
  }

  public parseProgram(): ASTNode {
    const statements: ASTNode[] = [];
    while (!this.match("EOF")) {
      statements.push(this.parseStatement());
    }
    return { type: "BlockStatement", body: statements };
  }

  private parseStatement(): ASTNode {
    if (this.match("KEYWORD", "if")) {
      this.consume(); // if
      this.expect("PUNCT", "(");
      const test = this.parseExpression();
      this.expect("PUNCT", ")");
      const consequent = this.parseStatement();
      let alternate: ASTNode | undefined;
      if (this.match("KEYWORD", "else")) {
        this.consume();
        alternate = this.parseStatement();
      }
      return { type: "IfStatement", test, consequent, alternate };
    }

    if (this.match("KEYWORD", "while")) {
      this.consume(); // while
      this.expect("PUNCT", "(");
      const test = this.parseExpression();
      this.expect("PUNCT", ")");
      const body = this.parseStatement();
      return { type: "WhileStatement", test, body };
    }

    if (this.match("KEYWORD", "return")) {
      this.consume(); // return
      let argument: ASTNode | undefined;
      if (!this.match("PUNCT", ";") && !this.match("EOF") && !this.match("PUNCT", "}")) {
        argument = this.parseExpression();
      }
      if (this.match("PUNCT", ";")) this.consume();
      return { type: "ReturnStatement", argument };
    }

    if (
      this.match("KEYWORD", "const") ||
      this.match("KEYWORD", "let") ||
      this.match("KEYWORD", "var")
    ) {
      const kind = this.consume().value as "const" | "let" | "var";
      const idTok = this.expect("IDENTIFIER");
      this.expect("OPERATOR", "=");
      const init = this.parseExpression();
      if (this.match("PUNCT", ";")) this.consume();
      return { type: "VariableDeclaration", kind, name: idTok.value, init };
    }

    if (this.match("PUNCT", "{")) {
      this.consume();
      const body: ASTNode[] = [];
      while (!this.match("PUNCT", "}") && !this.match("EOF")) {
        body.push(this.parseStatement());
      }
      this.expect("PUNCT", "}");
      return { type: "BlockStatement", body };
    }

    const expr = this.parseExpression();
    if (this.match("PUNCT", ";")) this.consume();
    return { type: "ExpressionStatement", expression: expr };
  }

  private parseExpression(): ASTNode {
    return this.parseAssignment();
  }

  private parseAssignment(): ASTNode {
    const left = this.parseLogicalOr();
    if (this.match("OPERATOR", "=")) {
      this.consume();
      const right = this.parseAssignment();
      return { type: "AssignmentExpression", left, right };
    }
    return left;
  }

  private parseLogicalOr(): ASTNode {
    let left = this.parseLogicalAnd();
    while (this.match("OPERATOR", "||")) {
      const op = this.consume().value;
      const right = this.parseLogicalAnd();
      left = { type: "BinaryExpression", operator: op, left, right };
    }
    return left;
  }

  private parseLogicalAnd(): ASTNode {
    let left = this.parseEquality();
    while (this.match("OPERATOR", "&&")) {
      const op = this.consume().value;
      const right = this.parseEquality();
      left = { type: "BinaryExpression", operator: op, left, right };
    }
    return left;
  }

  private parseEquality(): ASTNode {
    let left = this.parseRelational();
    while (
      this.match("OPERATOR", "===") ||
      this.match("OPERATOR", "!==") ||
      this.match("OPERATOR", "==") ||
      this.match("OPERATOR", "!=")
    ) {
      const op = this.consume().value;
      const right = this.parseRelational();
      left = { type: "BinaryExpression", operator: op, left, right };
    }
    return left;
  }

  private parseRelational(): ASTNode {
    let left = this.parseAdditive();
    while (
      this.match("OPERATOR", "<") ||
      this.match("OPERATOR", ">") ||
      this.match("OPERATOR", "<=") ||
      this.match("OPERATOR", ">=")
    ) {
      const op = this.consume().value;
      const right = this.parseAdditive();
      left = { type: "BinaryExpression", operator: op, left, right };
    }
    return left;
  }

  private parseAdditive(): ASTNode {
    let left = this.parseUnary();
    while (this.match("OPERATOR", "+") || this.match("OPERATOR", "-")) {
      const op = this.consume().value;
      const right = this.parseUnary();
      left = { type: "BinaryExpression", operator: op, left, right };
    }
    return left;
  }

  private parseUnary(): ASTNode {
    if (this.match("OPERATOR", "!") || this.match("OPERATOR", "-")) {
      const op = this.consume().value;
      const arg = this.parseUnary();
      return { type: "UnaryExpression", operator: op, argument: arg };
    }
    return this.parseMemberOrCall();
  }

  private parseMemberOrCall(): ASTNode {
    let obj = this.parsePrimary();

    while (true) {
      if (this.match("OPERATOR", ".")) {
        this.consume();
        const propTok = this.expect("IDENTIFIER");
        if (FORBIDDEN_IDENTIFIERS.has(propTok.value)) {
          throw new HookSandboxSecurityError(
            `Access to property '${propTok.value}' is strictly forbidden`
          );
        }
        obj = {
          type: "MemberExpression",
          object: obj,
          property: { type: "Identifier", name: propTok.value },
          computed: false,
        };
      } else if (this.match("PUNCT", "[")) {
        this.consume();
        const prop = this.parseExpression();
        this.expect("PUNCT", "]");
        obj = { type: "MemberExpression", object: obj, property: prop, computed: true };
      } else if (this.match("PUNCT", "(")) {
        this.consume();
        const args: ASTNode[] = [];
        if (!this.match("PUNCT", ")")) {
          args.push(this.parseExpression());
          while (this.match("PUNCT", ",")) {
            this.consume();
            args.push(this.parseExpression());
          }
        }
        this.expect("PUNCT", ")");
        obj = { type: "CallExpression", callee: obj, arguments: args };
      } else {
        break;
      }
    }

    return obj;
  }

  private parsePrimary(): ASTNode {
    const tok = this.peek();

    if (tok.type === "STRING") {
      this.consume();
      return { type: "Literal", value: tok.value };
    }
    if (tok.type === "NUMBER") {
      this.consume();
      return { type: "Literal", value: Number(tok.value) };
    }
    if (tok.type === "BOOLEAN") {
      this.consume();
      return { type: "Literal", value: tok.value === "true" };
    }
    if (tok.type === "NULL") {
      this.consume();
      return { type: "Literal", value: null };
    }
    if (tok.type === "IDENTIFIER") {
      this.consume();
      return { type: "Identifier", name: tok.value };
    }

    if (tok.type === "PUNCT" && tok.value === "(") {
      this.consume();
      const expr = this.parseExpression();
      this.expect("PUNCT", ")");
      return expr;
    }

    if (tok.type === "PUNCT" && tok.value === "{") {
      this.consume();
      const properties: { key: string; value: ASTNode }[] = [];
      if (!this.match("PUNCT", "}")) {
        while (true) {
          let keyName = "";
          if (this.match("IDENTIFIER") || this.match("STRING")) {
            keyName = this.consume().value;
          } else {
            throw new HookSandboxSecurityError(
              `Expected property key in object literal, got '${this.peek().value}'`
            );
          }
          this.expect("PUNCT", ":");
          const val = this.parseExpression();
          properties.push({ key: keyName, value: val });
          if (this.match("PUNCT", ",")) {
            this.consume();
            if (this.match("PUNCT", "}")) break;
          } else {
            break;
          }
        }
      }
      this.expect("PUNCT", "}");
      return { type: "ObjectExpression", properties };
    }

    if (tok.type === "PUNCT" && tok.value === "[") {
      this.consume();
      const elements: ASTNode[] = [];
      if (!this.match("PUNCT", "]")) {
        elements.push(this.parseExpression());
        while (this.match("PUNCT", ",")) {
          this.consume();
          if (this.match("PUNCT", "]")) break;
          elements.push(this.parseExpression());
        }
      }
      this.expect("PUNCT", "]");
      return { type: "ArrayExpression", elements };
    }

    throw new HookSandboxSecurityError(
      `Parse error: unexpected token '${tok.value}' (${tok.type})`
    );
  }
}

// ── Sandboxed Interpreter ────────────────────────────────────────────────

interface Scope {
  vars: Map<string, any>;
  parent?: Scope;
}

class ReturnSignal {
  constructor(public value: any) {}
}

class Evaluator {
  private steps = 0;

  constructor(private rootScope: Scope) {}

  private checkStepLimit() {
    this.steps++;
    if (this.steps > MAX_EXECUTION_STEPS) {
      throw new HookSandboxSecurityError(
        `Execution step limit exceeded (${MAX_EXECUTION_STEPS} ops)`
      );
    }
  }

  public evalNode(node: ASTNode, scope: Scope): any {
    this.checkStepLimit();

    switch (node.type) {
      case "BlockStatement": {
        const blockScope: Scope = { vars: new Map(), parent: scope };
        for (const stmt of node.body) {
          const res = this.evalNode(stmt, blockScope);
          if (res instanceof ReturnSignal) return res;
        }
        return undefined;
      }

      case "IfStatement": {
        const cond = this.evalNode(node.test, scope);
        if (cond) {
          return this.evalNode(node.consequent, scope);
        } else if (node.alternate) {
          return this.evalNode(node.alternate, scope);
        }
        return undefined;
      }

      case "WhileStatement": {
        while (this.evalNode(node.test, scope)) {
          const res = this.evalNode(node.body, scope);
          if (res instanceof ReturnSignal) return res;
        }
        return undefined;
      }

      case "ReturnStatement": {
        const val = node.argument ? this.evalNode(node.argument, scope) : undefined;
        return new ReturnSignal(val);
      }

      case "VariableDeclaration": {
        const initVal = this.evalNode(node.init, scope);
        scope.vars.set(node.name, initVal);
        return initVal;
      }

      case "ExpressionStatement": {
        return this.evalNode(node.expression, scope);
      }

      case "AssignmentExpression": {
        const rightVal = this.evalNode(node.right, scope);
        if (node.left.type === "Identifier") {
          let s: Scope | undefined = scope;
          while (s) {
            if (s.vars.has(node.left.name)) {
              s.vars.set(node.left.name, rightVal);
              return rightVal;
            }
            s = s.parent;
          }
          scope.vars.set(node.left.name, rightVal);
          return rightVal;
        } else if (node.left.type === "MemberExpression") {
          const obj = this.evalNode(node.left.object, scope);
          const prop = node.left.computed
            ? this.evalNode(node.left.property, scope)
            : (node.left.property as any).name;

          if (FORBIDDEN_IDENTIFIERS.has(String(prop))) {
            throw new HookSandboxSecurityError(
              `Access to property '${String(prop)}' is strictly forbidden`
            );
          }
          if (obj && typeof obj === "object") {
            obj[prop] = rightVal;
          }
          return rightVal;
        }
        throw new HookSandboxSecurityError("Invalid assignment target");
      }

      case "BinaryExpression": {
        const l = this.evalNode(node.left, scope);
        const r = this.evalNode(node.right, scope);
        switch (node.operator) {
          case "===":
          case "==":
            return l === r;
          case "!==":
          case "!=":
            return l !== r;
          case "<":
            return l < r;
          case ">":
            return l > r;
          case "<=":
            return l <= r;
          case ">=":
            return l >= r;
          case "&&":
            return l && r;
          case "||":
            return l || r;
          case "+":
            return l + r;
          case "-":
            return l - r;
          default:
            throw new HookSandboxSecurityError(`Unsupported operator '${node.operator}'`);
        }
      }

      case "UnaryExpression": {
        const arg = this.evalNode(node.argument, scope);
        if (node.operator === "!") return !arg;
        if (node.operator === "-") return -arg;
        throw new HookSandboxSecurityError(`Unsupported unary operator '${node.operator}'`);
      }

      case "MemberExpression": {
        const obj = this.evalNode(node.object, scope);
        const prop = node.computed
          ? this.evalNode(node.property, scope)
          : (node.property as any).name;

        if (FORBIDDEN_IDENTIFIERS.has(String(prop))) {
          throw new HookSandboxSecurityError(
            `Access to property '${String(prop)}' is strictly forbidden`
          );
        }

        if (obj === null || obj === undefined) {
          return undefined;
        }
        return obj[prop];
      }

      case "CallExpression": {
        const calleeObj =
          node.callee.type === "MemberExpression"
            ? this.evalNode(node.callee.object, scope)
            : undefined;
        const calleeFn = this.evalNode(node.callee, scope);
        const argVals = node.arguments.map((a) => this.evalNode(a, scope));

        if (typeof calleeFn === "function") {
          return calleeFn.apply(calleeObj, argVals);
        }
        throw new HookSandboxSecurityError("Attempted to call a non-function target");
      }

      case "ObjectExpression": {
        const obj: Record<string, any> = {};
        for (const prop of node.properties) {
          if (FORBIDDEN_IDENTIFIERS.has(prop.key)) {
            throw new HookSandboxSecurityError(
              `Access to property '${prop.key}' is strictly forbidden`
            );
          }
          obj[prop.key] = this.evalNode(prop.value, scope);
        }
        return obj;
      }

      case "ArrayExpression": {
        return node.elements.map((el) => this.evalNode(el, scope));
      }

      case "Identifier": {
        if (FORBIDDEN_IDENTIFIERS.has(node.name)) {
          throw new HookSandboxSecurityError(
            `Access to identifier '${node.name}' is strictly forbidden`
          );
        }
        let s: Scope | undefined = scope;
        while (s) {
          if (s.vars.has(node.name)) return s.vars.get(node.name);
          s = s.parent;
        }
        throw new HookSandboxSecurityError(`Identifier '${node.name}' is not defined`);
      }

      case "Literal":
        return node.value;
    }
  }
}

// ── Main Sandbox Compiler & Execution Entrypoints ──────────────────────────

/**
 * Compile hook code into a sandboxed middleware execution function.
 * Validates JSON DSL or parses AST synchronously at compile time.
 */
export function compileHookSandbox(code: string, _hookName: string): HookMiddleware {
  const trimmed = code.trim();

  // 1. Try JSON DSL parse synchronously
  const jsonRules = parseJsonDsl(trimmed);
  if (jsonRules) {
    return async (context: PreRequestHookContext): Promise<HookResult> => {
      return executeJsonDslRules(jsonRules, context);
    };
  }

  // 2. Tokenize and Parse AST synchronously to enforce compile-time security & validation
  const tokens = tokenize(trimmed);
  const parser = new Parser(tokens);
  const ast = parser.parseProgram();

  return async (context: PreRequestHookContext): Promise<HookResult> => {
    const rootScope: Scope = {
      vars: new Map([["context", context]]),
    };

    const evaluator = new Evaluator(rootScope);
    const outcome = evaluator.evalNode(ast, rootScope);

    if (outcome instanceof ReturnSignal) {
      const res = outcome.value;
      if (res && typeof res === "object") {
        return res as HookResult;
      }
    }

    return {};
  };
}

/**
 * Direct execution helper for sandboxed hooks.
 */
export async function executeSandboxedHook(
  code: string,
  hookName: string,
  context: PreRequestHookContext
): Promise<HookResult> {
  const middleware = compileHookSandbox(code, hookName);
  return middleware(context);
}

/**
 * Migration helper to validate and test stored legacy hook code.
 */
export function migrateLegacyHookCode(code: string): { valid: boolean; error?: string } {
  try {
    const trimmed = code.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      const rules = parseJsonDsl(trimmed);
      if (rules) return { valid: true };
    }
    const tokens = tokenize(trimmed);
    const parser = new Parser(tokens);
    parser.parseProgram();
    return { valid: true };
  } catch (err: unknown) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : "Unparseable legacy code",
    };
  }
}
