import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CLI_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT_DIR = join(CLI_DIR, "..", "..");
const require = createRequire(import.meta.url);

export const COMMON_PROVIDERS = [
  { id: "openai", name: "OpenAI" },
  { id: "anthropic", name: "Anthropic" },
  { id: "google", name: "Google AI" },
  { id: "openrouter", name: "OpenRouter" },
  { id: "groq", name: "Groq" },
  { id: "mistral", name: "Mistral" },
];

/**
 * Raised when a configured source root is missing, unreadable, malformed, or
 * does not expose a supported OmniRoute provider source shape.
 *
 * Diagnostics carry only root-relative paths and TypeScript parser messages so
 * no absolute developer path or source literal leaks into CLI output.
 */
export class ProviderSourceError extends Error {
  constructor(message) {
    super(message);
    this.name = "ProviderSourceError";
  }
}

export function compareStrings(a, b) {
  const strA = String(a ?? "");
  const strB = String(b ?? "");
  if (strA < strB) return -1;
  if (strA > strB) return 1;
  return 0;
}

export function normalizeDisplayRoot(rootDir, baseDir = process.cwd()) {
  if (!rootDir || typeof rootDir !== "string") return ".";
  const absBase = resolve(baseDir);
  const absRoot = resolve(absBase, rootDir);

  if (absRoot === absBase) return ".";

  const rel = relative(absBase, absRoot);
  if (!rel.startsWith("..") && !isAbsolute(rel)) {
    return rel;
  }
  const baseName = absRoot.split("/").filter(Boolean).pop() || "root";
  return `[external]/${baseName}`;
}

const REASONING_UNSUPPORTED_VALS = [
  "temperature",
  "top_p",
  "frequency_penalty",
  "presence_penalty",
  "logprobs",
  "top_logprobs",
  "n",
];

function normalizeCatalogCategory(exportName) {
  const raw = exportName
    .replace(/_PROVIDERS(_[A-Z0-9_]+)?$/, "")
    .toLowerCase()
    .replaceAll("_", "-");
  if (raw === "apikey" || raw.startsWith("apikey-")) return "api-key";
  if (raw === "audio-only") return "audio";
  return raw;
}

function loadTypeScript() {
  try {
    return require("typescript");
  } catch {
    return null;
  }
}

function getPropertyName(ts, name) {
  if (!name) return null;
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return null;
}

function getObjectProperty(ts, objectLiteral, propertyName) {
  if (!objectLiteral || !objectLiteral.properties) return null;
  return objectLiteral.properties.find(
    (property) =>
      ts.isPropertyAssignment(property) && getPropertyName(ts, property.name) === propertyName
  );
}

function getStringProperty(ts, objectLiteral, propertyName) {
  const property = getObjectProperty(ts, objectLiteral, propertyName);
  const initializer = property?.initializer;
  if (!initializer) return null;
  if (ts.isStringLiteral(initializer) || ts.isNoSubstitutionTemplateLiteral(initializer)) {
    return initializer.text;
  }
  return null;
}

function getNumberProperty(ts, objectLiteral, propertyName) {
  const property = getObjectProperty(ts, objectLiteral, propertyName);
  const initializer = property?.initializer;
  if (!initializer) return null;
  if (ts.isNumericLiteral(initializer)) {
    return Number(initializer.text);
  }
  return null;
}

function getBooleanProperty(ts, objectLiteral, propertyName) {
  const property = getObjectProperty(ts, objectLiteral, propertyName);
  const initializer = property?.initializer;
  if (!initializer) return false;
  return initializer.kind === ts.SyntaxKind.TrueKeyword;
}

function scanTsFiles(dirOrFile) {
  if (!existsSync(dirOrFile)) return [];
  const stat = statSync(dirOrFile);
  if (stat.isFile()) {
    return dirOrFile.endsWith(".ts") ? [dirOrFile] : [];
  }
  const files = [];
  for (const entry of readdirSync(dirOrFile, { withFileTypes: true })) {
    const full = join(dirOrFile, entry.name);
    if (entry.isDirectory()) {
      files.push(...scanTsFiles(full));
    } else if (entry.name.endsWith(".ts")) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Reject a source file whose TypeScript parse produced syntax diagnostics.
 * A malformed export would otherwise be silently partially-extracted, which
 * fabricates a provider inventory from a broken source.
 */
function assertParsable(ts, sourceFile, relPath) {
  const diagnostics = sourceFile.parseDiagnostics || [];
  if (diagnostics.length === 0) return;
  const first = ts.flattenDiagnosticMessageText(diagnostics[0].messageText, " ");
  throw new ProviderSourceError(
    `Malformed provider source '${relPath}': ${diagnostics.length} parse error(s); first: ${first}`
  );
}

function extractProviderBlocks(source, filePath, rootDir) {
  const ts = loadTypeScript();
  if (!ts) return [];

  const providers = [];
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);
  const relPath = relative(rootDir, filePath);
  assertParsable(ts, sourceFile, relPath);

  sourceFile.forEachChild((node) => {
    if (!ts.isVariableStatement(node)) return;

    for (const declaration of node.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;
      const exportName = declaration.name.text;
      if (!exportName.includes("_PROVIDERS")) continue;
      if (!declaration.initializer || !ts.isObjectLiteralExpression(declaration.initializer)) {
        continue;
      }

      const category = normalizeCatalogCategory(exportName);
      for (const property of declaration.initializer.properties) {
        if (!ts.isPropertyAssignment(property)) continue;
        if (!ts.isObjectLiteralExpression(property.initializer)) continue;

        const key = getPropertyName(ts, property.name);
        if (!key) continue;

        const id = getStringProperty(ts, property.initializer, "id") || key;
        const name = getStringProperty(ts, property.initializer, "name") || id;

        providers.push({
          id,
          name,
          category,
          alias: getStringProperty(ts, property.initializer, "alias"),
          website: getStringProperty(ts, property.initializer, "website"),
          deprecated: getBooleanProperty(ts, property.initializer, "deprecated"),
          hasFree: getBooleanProperty(ts, property.initializer, "hasFree"),
          passthroughModels: getBooleanProperty(ts, property.initializer, "passthroughModels"),
          sourceFile: relPath,
        });
      }
    }
  });

  return providers;
}

// ── AST Resolution Helpers for Runtime Registry & Models ─────────────────

function unwrapASTNode(ts, node) {
  let curr = node;
  while (curr) {
    if (ts.isAsExpression && ts.isAsExpression(curr)) {
      curr = curr.expression;
    } else if (ts.isSatisfiesExpression && ts.isSatisfiesExpression(curr)) {
      curr = curr.expression;
    } else if (ts.isParenthesizedExpression && ts.isParenthesizedExpression(curr)) {
      curr = curr.expression;
    } else if (
      ts.isCallExpression(curr) &&
      (
        (ts.isPropertyAccessExpression(curr.expression) &&
          curr.expression.expression &&
          ts.isIdentifier(curr.expression.expression) &&
          curr.expression.expression.text === "Object" &&
          curr.expression.name.text === "freeze") ||
        (ts.isIdentifier(curr.expression) && curr.expression.text === "Object.freeze")
      ) &&
      curr.arguments.length > 0
    ) {
      curr = curr.arguments[0];
    } else {
      break;
    }
  }
  return curr;
}

function resolveTsModulePath(baseDir, importSpecifier) {
  if (!importSpecifier || typeof importSpecifier !== "string") return null;
  if (!importSpecifier.startsWith(".")) return null;
  const candidate = resolve(baseDir, importSpecifier);
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  if (existsSync(`${candidate}.ts`)) return `${candidate}.ts`;
  if (existsSync(join(candidate, "index.ts"))) return join(candidate, "index.ts");
  return null;
}

function parseFileAst(ts, filePath, rootDir, astCache) {
  if (astCache.has(filePath)) return astCache.get(filePath);
  if (!existsSync(filePath)) return null;
  try {
    const source = readFileSync(filePath, "utf-8");
    const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);
    const relPath = relative(rootDir, filePath);
    assertParsable(ts, sourceFile, relPath);
    const item = { filePath, relPath, source, sourceFile };
    astCache.set(filePath, item);
    return item;
  } catch (err) {
    throw err;
  }
}

function findImportedSymbol(ts, sourceFile, symbolName) {
  let result = null;
  sourceFile.forEachChild((node) => {
    if (result) return;
    if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const moduleSpecifier = node.moduleSpecifier.text;
      const clause = node.importClause;
      if (!clause) return;

      if (clause.name && clause.name.text === symbolName) {
        result = { moduleSpecifier, importedName: "default" };
      } else if (clause.namedBindings) {
        if (ts.isNamedImports(clause.namedBindings)) {
          for (const spec of clause.namedBindings.elements) {
            const name = spec.name.text;
            const prop = spec.propertyName ? spec.propertyName.text : name;
            if (name === symbolName) {
              result = { moduleSpecifier, importedName: prop };
            }
          }
        }
      }
    }
  });
  return result;
}

function findLocalDeclaration(ts, sourceFile, symbolName) {
  let result = null;
  sourceFile.forEachChild((node) => {
    if (result) return;
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.name.text === symbolName) {
          result = decl.initializer;
        }
      }
    } else if (ts.isExportAssignment(node) && symbolName === "default") {
      result = node.expression;
    }
  });
  return result;
}

function resolveSymbol(ts, symbolName, filePath, rootDir, astCache, depth = 0) {
  if (depth > 10 || !filePath) return null;
  const parsed = parseFileAst(ts, filePath, rootDir, astCache);
  if (!parsed) return null;

  const localNode = findLocalDeclaration(ts, parsed.sourceFile, symbolName);
  if (localNode) {
    return { node: unwrapASTNode(ts, localNode), filePath };
  }

  const imp = findImportedSymbol(ts, parsed.sourceFile, symbolName);
  if (imp) {
    const targetPath = resolveTsModulePath(dirname(filePath), imp.moduleSpecifier);
    if (targetPath) {
      return resolveSymbol(ts, imp.importedName, targetPath, rootDir, astCache, depth + 1);
    }
  }

  return null;
}

function parseModelObjectAST(ts, rawElem, currentFilePath, rootDir, astCache, depth = 0) {
  const elem = unwrapASTNode(ts, rawElem);
  if (!elem || !ts.isObjectLiteralExpression(elem)) return null;

  let fields = {
    id: null,
    name: null,
    contextLength: null,
    maxInputTokens: null,
    unsupportedParams: null,
  };

  for (const prop of elem.properties) {
    if (ts.isSpreadAssignment(prop) && ts.isIdentifier(prop.expression)) {
      const resolved = resolveSymbol(ts, prop.expression.text, currentFilePath, rootDir, astCache, depth + 1);
      if (resolved && resolved.node && ts.isObjectLiteralExpression(resolved.node)) {
        const spreadFields = parseModelObjectAST(ts, resolved.node, resolved.filePath, rootDir, astCache, depth + 1);
        if (spreadFields) {
          // Spread defaults are inherited first; explicit properties below then override them.
          // Keeping the accumulator's null defaults on the right would erase spread values.
          fields = { ...fields, ...spreadFields };
        }
      }
    } else if (ts.isPropertyAssignment(prop)) {
      const pName = getPropertyName(ts, prop.name);
      if (pName === "id") fields.id = getStringProperty(ts, elem, "id");
      if (pName === "name") fields.name = getStringProperty(ts, elem, "name");
      if (pName === "contextLength") fields.contextLength = getNumberProperty(ts, elem, "contextLength");
      if (pName === "maxInputTokens") fields.maxInputTokens = getNumberProperty(ts, elem, "maxInputTokens");
      if (pName === "unsupportedParams") {
        const init = unwrapASTNode(ts, prop.initializer);
        if (init && ts.isIdentifier(init) && init.text === "REASONING_UNSUPPORTED") {
          fields.unsupportedParams = REASONING_UNSUPPORTED_VALS;
        } else if (init && ts.isArrayLiteralExpression(init)) {
          fields.unsupportedParams = init.elements
            .map((e) => {
              const u = unwrapASTNode(ts, e);
              return u && (ts.isStringLiteral(u) || ts.isNoSubstitutionTemplateLiteral(u)) ? u.text : null;
            })
            .filter(Boolean);
        }
      }
    }
  }

  if (!fields.id) return null;
  if (!fields.name) fields.name = fields.id;
  return fields;
}

function parseModelsArrayAST(ts, rawNode, currentFilePath, rootDir, astCache, depth = 0) {
  const initNode = unwrapASTNode(ts, rawNode);
  if (!initNode || depth > 10) return [];

  if (ts.isIdentifier(initNode)) {
    const resolved = resolveSymbol(ts, initNode.text, currentFilePath, rootDir, astCache, depth + 1);
    if (resolved && resolved.node) {
      return parseModelsArrayAST(ts, resolved.node, resolved.filePath, rootDir, astCache, depth + 1);
    }
    return [];
  }

  if (ts.isPropertyAccessExpression(initNode) || ts.isElementAccessExpression(initNode)) {
    const objExpr = initNode.expression;
    let propName = null;
    if (ts.isPropertyAccessExpression(initNode)) {
      propName = initNode.name.text;
    } else if (ts.isElementAccessExpression(initNode) && ts.isStringLiteral(initNode.argumentExpression)) {
      propName = initNode.argumentExpression.text;
    }

    if (ts.isIdentifier(objExpr) && propName) {
      const resolved = resolveSymbol(ts, objExpr.text, currentFilePath, rootDir, astCache, depth + 1);
      if (resolved && resolved.node && ts.isObjectLiteralExpression(resolved.node)) {
        const prop = getObjectProperty(ts, resolved.node, propName);
        if (prop && prop.initializer) {
          return parseModelsArrayAST(ts, prop.initializer, resolved.filePath, rootDir, astCache, depth + 1);
        }
      }
    }
    return [];
  }

  if (ts.isArrayLiteralExpression(initNode)) {
    const models = [];
    for (const elem of initNode.elements) {
      const unwrappedElem = unwrapASTNode(ts, elem);
      if (ts.isSpreadElement(unwrappedElem)) {
        const spreadModels = parseModelsArrayAST(ts, unwrappedElem.expression, currentFilePath, rootDir, astCache, depth + 1);
        models.push(...spreadModels);
      } else if (ts.isStringLiteral(unwrappedElem) || ts.isNoSubstitutionTemplateLiteral(unwrappedElem)) {
        models.push({
          id: unwrappedElem.text,
          name: unwrappedElem.text,
          contextLength: null,
          maxInputTokens: null,
          unsupportedParams: null,
        });
      } else if (ts.isObjectLiteralExpression(unwrappedElem)) {
        const parsed = parseModelObjectAST(ts, unwrappedElem, currentFilePath, rootDir, astCache, depth);
        if (parsed) models.push(parsed);
      }
    }
    return models;
  }

  if (ts.isCallExpression(initNode)) {
    if (ts.isIdentifier(initNode.expression) && initNode.expression.text === "buildModels") {
      if (initNode.arguments.length > 0) {
        return parseModelsArrayAST(ts, initNode.arguments[0], currentFilePath, rootDir, astCache, depth + 1);
      }
    } else if (ts.isPropertyAccessExpression(initNode.expression) && initNode.expression.name.text === "map") {
      return parseModelsArrayAST(ts, initNode.expression.expression, currentFilePath, rootDir, astCache, depth + 1);
    }
  }

  return [];
}

function parseProviderObjectAST(ts, rawNode, currentFilePath, rootDir, astCache, depth = 0) {
  const objNode = unwrapASTNode(ts, rawNode);
  if (!objNode) return null;

  // Handle CallExpression helper `buildOpenAiCompatibleRegistryEntry(arg)`
  if (ts.isCallExpression(objNode)) {
    const funcName = ts.isIdentifier(objNode.expression) ? objNode.expression.text : null;
    if (funcName === "buildOpenAiCompatibleRegistryEntry" && objNode.arguments.length > 0) {
      const argObj = objNode.arguments[0];
      const parsedArg = parseProviderObjectAST(ts, argObj, currentFilePath, rootDir, astCache, depth + 1);
      if (parsedArg) {
        return {
          format: "openai",
          executor: "default",
          authType: "apikey",
          authHeader: "bearer",
          passthroughModels: false,
          models: [],
          ...parsedArg,
        };
      }
    }
    return null;
  }

  if (!ts.isObjectLiteralExpression(objNode)) return null;

  const res = {
    id: null,
    alias: null,
    format: null,
    executor: null,
    authType: null,
    baseUrl: null,
    passthroughModels: false,
    models: [],
  };

  for (const prop of objNode.properties) {
    if (ts.isSpreadAssignment(prop) && ts.isIdentifier(prop.expression)) {
      const resolved = resolveSymbol(ts, prop.expression.text, currentFilePath, rootDir, astCache, depth + 1);
      if (resolved && resolved.node && ts.isObjectLiteralExpression(resolved.node)) {
        const spreadRes = parseProviderObjectAST(ts, resolved.node, resolved.filePath, rootDir, astCache, depth + 1);
        if (spreadRes) {
          Object.assign(res, spreadRes);
        }
      }
    }
  }

  for (const prop of objNode.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const name = getPropertyName(ts, prop.name);
    if (!name) continue;

    if (name === "id") res.id = getStringProperty(ts, objNode, "id");
    if (name === "alias") res.alias = getStringProperty(ts, objNode, "alias");
    if (name === "format") res.format = getStringProperty(ts, objNode, "format");
    if (name === "executor") res.executor = getStringProperty(ts, objNode, "executor");
    if (name === "authType") res.authType = getStringProperty(ts, objNode, "authType");
    if (name === "baseUrl") res.baseUrl = getStringProperty(ts, objNode, "baseUrl");
    if (name === "passthroughModels") res.passthroughModels = getBooleanProperty(ts, objNode, "passthroughModels");
    if (name === "models") {
      res.models = parseModelsArrayAST(ts, prop.initializer, currentFilePath, rootDir, astCache);
    }
  }

  res.models.sort((a, b) => compareStrings(a.id, b.id));
  return res;
}

function fallbackAvailableProviders() {
  return COMMON_PROVIDERS.map((provider) => ({
    ...provider,
    category: "api-key",
    alias: null,
    website: null,
    deprecated: false,
    hasFree: false,
    passthroughModels: false,
    sourceFile: "fallback",
  }));
}

function resolveProviderCatalogPath(rootDir, options = {}) {
  const configuredPath = options.catalogPath || process.env.OMNIROUTE_PROVIDER_CATALOG_PATH;
  if (configuredPath) {
    return isAbsolute(configuredPath) ? configuredPath : resolve(rootDir, configuredPath);
  }
  return join(rootDir, "src", "shared", "constants", "providers.ts");
}

export function loadAvailableProviders(options = {}) {
  const opts = typeof options === "object" && options !== null ? options : {};
  const rootDir = typeof options === "string" ? options : opts.rootDir || DEFAULT_ROOT_DIR;
  const strict = opts.strict === true;
  const displayRoot = opts.displayRoot
    ? normalizeDisplayRoot(opts.displayRoot)
    : normalizeDisplayRoot(rootDir);
  const catalogPath = resolveProviderCatalogPath(rootDir, opts);
  const catalogDir = join(rootDir, "src", "shared", "constants", "providers");

  const files = [];
  if (existsSync(catalogPath)) files.push(catalogPath);
  if (existsSync(catalogDir)) files.push(...scanTsFiles(catalogDir));

  if (files.length === 0) {
    if (strict) {
      throw new ProviderSourceError(
        `No provider catalog source found under '${displayRoot}'. Expected ` +
          `'src/shared/constants/providers.ts' or 'src/shared/constants/providers/'.`
      );
    }
    return fallbackAvailableProviders();
  }

  const providers = [];
  const seen = new Set();

  for (const file of files) {
    try {
      const source = readFileSync(file, "utf-8");
      const extracted = extractProviderBlocks(source, file, rootDir);
      for (const p of extracted) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          providers.push(p);
        }
      }
    } catch (err) {
      if (strict) throw err;
    }
  }

  if (providers.length === 0) {
    if (strict) {
      throw new ProviderSourceError(
        `Provider catalog source under '${displayRoot}' exported no recognizable ` +
          `'*_PROVIDERS' object literals (unsupported source shape).`
      );
    }
    return fallbackAvailableProviders();
  }

  return providers.sort((a, b) => compareStrings(a.id, b.id));
}

export function loadRuntimeProviders(options = {}) {
  const opts = typeof options === "object" && options !== null ? options : {};
  const rootDir = typeof options === "string" ? options : opts.rootDir || DEFAULT_ROOT_DIR;
  const strict = opts.strict === true;
  const displayRoot = opts.displayRoot
    ? normalizeDisplayRoot(opts.displayRoot)
    : normalizeDisplayRoot(rootDir);

  const ts = loadTypeScript();
  if (!ts) return [];

  const astCache = new Map();

  const indexCandidates = [
    join(rootDir, "open-sse", "config", "providers", "index.ts"),
    join(rootDir, "open-sse", "config", "providerRegistry.ts"),
  ];

  const indexPath = indexCandidates.find((p) => existsSync(p));

  if (!indexPath) {
    if (strict) {
      throw new ProviderSourceError(
        `No runtime provider registry source found under '${displayRoot}'. Expected ` +
          `'open-sse/config/providers/index.ts' or 'open-sse/config/providerRegistry.ts'.`
      );
    }
    return [];
  }

  const parsedIndex = parseFileAst(ts, indexPath, rootDir, astCache);
  if (!parsedIndex) return [];

  let registryObjNode = null;
  parsedIndex.sourceFile.forEachChild((node) => {
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (
          ts.isIdentifier(decl.name) &&
          decl.name.text === "REGISTRY" &&
          decl.initializer &&
          ts.isObjectLiteralExpression(decl.initializer)
        ) {
          registryObjNode = decl.initializer;
        }
      }
    }
  });

  if (!registryObjNode) {
    if (strict) {
      throw new ProviderSourceError(
        `Runtime provider registry source under '${displayRoot}' exported no canonical 'REGISTRY' object literal.`
      );
    }
    return [];
  }

  const providers = [];
  const seen = new Set();

  for (const prop of registryObjNode.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const key = getPropertyName(ts, prop.name);
    if (!key) continue;

    const val = prop.initializer;
    let providerObj = null;
    let sourceRelPath = relative(rootDir, indexPath);

    if (ts.isIdentifier(val)) {
      const resolved = resolveSymbol(ts, val.text, indexPath, rootDir, astCache);
      if (resolved && resolved.node) {
        sourceRelPath = relative(rootDir, resolved.filePath);
        providerObj = parseProviderObjectAST(ts, resolved.node, resolved.filePath, rootDir, astCache);
      }
    } else if (ts.isObjectLiteralExpression(val) || ts.isCallExpression(val)) {
      providerObj = parseProviderObjectAST(ts, val, indexPath, rootDir, astCache);
    }

    if (providerObj) {
      if (!providerObj.id) providerObj.id = key;
      providerObj.sourceFile = sourceRelPath;

      if (!seen.has(providerObj.id)) {
        seen.add(providerObj.id);
        providers.push(providerObj);
      }
    }
  }

  return providers.sort((a, b) => compareStrings(a.id, b.id));
}

export const PROVIDER_SOURCE_KINDS = ["fork", "reference"];

/**
 * Version of the machine-readable inventory/diff contract consumed by
 * automation (Task 0153). Bump on any breaking field rename or removal.
 */
export const PROVIDER_INVENTORY_SCHEMA_VERSION = 1;

export function loadProviderInventory(options = {}) {
  const opts = typeof options === "object" && options !== null ? options : {};
  const rootDir = typeof options === "string" ? options : opts.rootDir || DEFAULT_ROOT_DIR;
  const sourceKind = opts.sourceKind || "fork";

  if (!PROVIDER_SOURCE_KINDS.includes(sourceKind)) {
    throw new ProviderSourceError(
      `Unsupported sourceKind '${sourceKind}'. Must be one of: ${PROVIDER_SOURCE_KINDS.join(", ")}.`
    );
  }

  if (typeof rootDir !== "string" || rootDir.trim() === "") {
    throw new ProviderSourceError("Source root must be a non-empty path string.");
  }

  const resolvedRoot = resolve(rootDir);
  const displayRoot = normalizeDisplayRoot(rootDir);

  if (!existsSync(resolvedRoot)) {
    throw new ProviderSourceError(`Source root directory does not exist: ${displayRoot}`);
  }
  if (!statSync(resolvedRoot).isDirectory()) {
    throw new ProviderSourceError(`Source root is not a directory: ${displayRoot}`);
  }

  const catalog = loadAvailableProviders({
    rootDir: resolvedRoot,
    strict: true,
    displayRoot,
  });
  const registry = loadRuntimeProviders({
    rootDir: resolvedRoot,
    strict: true,
    displayRoot,
  });

  const catalogMap = new Map(catalog.map((item) => [item.id, item]));
  const registryMap = new Map(registry.map((item) => [item.id, item]));

  const allIds = Array.from(new Set([...catalogMap.keys(), ...registryMap.keys()])).sort(compareStrings);

  const combined = allIds.map((id) => {
    const catalogItem = catalogMap.get(id) || null;
    const registryItem = registryMap.get(id) || null;
    return {
      id,
      inCatalog: Boolean(catalogItem),
      inRegistry: Boolean(registryItem),
      isOrphan: Boolean(registryItem && !catalogItem),
      isCatalogOnly: Boolean(catalogItem && !registryItem),
      catalog: catalogItem,
      registry: registryItem,
    };
  });

  return {
    metadata: {
      schemaVersion: PROVIDER_INVENTORY_SCHEMA_VERSION,
      sourceKind,
      sourceRoot: displayRoot,
      generatedAt: new Date().toISOString(),
      caveat:
        sourceKind === "reference"
          ? `Static snapshot of '${displayRoot}' (not live upstream API).`
          : `Static snapshot of local fork catalog and runtime registry in '${displayRoot}'.`,
    },
    counts: {
      catalog: catalog.length,
      registry: registry.length,
      combined: combined.length,
      catalogOnly: combined.filter((c) => c.isCatalogOnly).length,
      registryOnly: combined.filter((c) => c.isOrphan).length,
      inBoth: combined.filter((c) => c.inCatalog && c.inRegistry).length,
    },
    catalog,
    registry,
    combined,
  };
}

export function compareProviderInventories(forkInventory, refInventory) {
  for (const [label, inv] of [
    ["fork", forkInventory],
    ["reference", refInventory],
  ]) {
    if (!inv || !Array.isArray(inv.combined) || !inv.metadata) {
      throw new ProviderSourceError(
        `Invalid ${label} inventory: expected an object from loadProviderInventory().`
      );
    }
  }

  const forkRoot = normalizeDisplayRoot(forkInventory.metadata.sourceRoot);
  const refRoot = normalizeDisplayRoot(refInventory.metadata.sourceRoot);

  const forkCombined = new Map(forkInventory.combined.map((c) => [c.id, c]));
  const refCombined = new Map(refInventory.combined.map((c) => [c.id, c]));

  const allIds = Array.from(new Set([...forkCombined.keys(), ...refCombined.keys()])).sort(compareStrings);

  const fork_only = [];
  const reference_only = [];
  const common = [];
  const changed = [];

  for (const id of allIds) {
    const forkItem = forkCombined.get(id);
    const refItem = refCombined.get(id);

    if (forkItem && !refItem) {
      fork_only.push(forkItem);
    } else if (!forkItem && refItem) {
      reference_only.push(refItem);
    } else if (forkItem && refItem) {
      const catalogDiff = diffCatalogItems(forkItem.catalog, refItem.catalog);
      const registryDiff = diffRegistryItems(forkItem.registry, refItem.registry);
      const modelDiff = diffModels(
        forkItem.registry?.models || [],
        refItem.registry?.models || []
      );

      const hasChanges =
        catalogDiff.changed ||
        registryDiff.changed ||
        modelDiff.added.length > 0 ||
        modelDiff.removed.length > 0 ||
        modelDiff.modified.length > 0;

      if (hasChanges) {
        changed.push({
          id,
          fork: forkItem,
          reference: refItem,
          catalogDiff: catalogDiff.diff,
          registryDiff: registryDiff.diff,
          modelDiff,
        });
      } else {
        common.push({
          id,
          fork: forkItem,
          reference: refItem,
        });
      }
    }
  }

  return {
    metadata: {
      schemaVersion: PROVIDER_INVENTORY_SCHEMA_VERSION,
      forkRoot,
      referenceRoot: refRoot,
      generatedAt: new Date().toISOString(),
      snapshotCaveat: `The reference directory (${refRoot}) is a static snapshot, not live upstream.`,
    },
    summary: {
      forkTotal: forkInventory.counts.combined,
      referenceTotal: refInventory.counts.combined,
      forkOnly: fork_only.length,
      referenceOnly: reference_only.length,
      common: common.length,
      changed: changed.length,
    },
    classifications: {
      fork_only,
      reference_only,
      common,
      changed,
    },
  };
}

function diffCatalogItems(forkCat, refCat) {
  if (!forkCat && !refCat) return { changed: false, diff: null };
  if (!forkCat || !refCat) {
    return {
      changed: true,
      diff: {
        presence: {
          fork: Boolean(forkCat),
          reference: Boolean(refCat),
        },
      },
    };
  }

  const fields = ["name", "category", "alias", "website", "deprecated", "hasFree", "passthroughModels"];
  const diff = {};
  let changed = false;

  for (const field of fields) {
    if (forkCat[field] !== refCat[field]) {
      changed = true;
      diff[field] = { fork: forkCat[field], reference: refCat[field] };
    }
  }

  return { changed, diff: changed ? diff : null };
}

function diffRegistryItems(forkReg, refReg) {
  if (!forkReg && !refReg) return { changed: false, diff: null };
  if (!forkReg || !refReg) {
    return {
      changed: true,
      diff: {
        presence: {
          fork: Boolean(forkReg),
          reference: Boolean(refReg),
        },
      },
    };
  }

  const fields = ["alias", "format", "executor", "authType", "baseUrl", "passthroughModels"];
  const diff = {};
  let changed = false;

  for (const field of fields) {
    if (forkReg[field] !== refReg[field]) {
      changed = true;
      diff[field] = { fork: forkReg[field], reference: refReg[field] };
    }
  }

  return { changed, diff: changed ? diff : null };
}

function diffModels(forkModels, refModels) {
  const forkMap = new Map(forkModels.map((m) => [m.id, m]));
  const refMap = new Map(refModels.map((m) => [m.id, m]));

  const allModelIds = Array.from(new Set([...forkMap.keys(), ...refMap.keys()])).sort(compareStrings);

  const added = [];
  const removed = [];
  const modified = [];

  for (const id of allModelIds) {
    const fModel = forkMap.get(id);
    const rModel = refMap.get(id);

    if (fModel && !rModel) {
      added.push(fModel);
    } else if (!fModel && rModel) {
      removed.push(rModel);
    } else if (fModel && rModel) {
      const fieldDiff = {};
      let isDiff = false;
      const fields = ["name", "contextLength", "maxInputTokens"];
      for (const field of fields) {
        if (fModel[field] !== rModel[field]) {
          isDiff = true;
          fieldDiff[field] = { fork: fModel[field], reference: rModel[field] };
        }
      }
      const fUnsupp = (fModel.unsupportedParams || []).join(",");
      const rUnsupp = (rModel.unsupportedParams || []).join(",");
      if (fUnsupp !== rUnsupp) {
        isDiff = true;
        fieldDiff.unsupportedParams = {
          fork: fModel.unsupportedParams,
          reference: rModel.unsupportedParams,
        };
      }

      if (isDiff) {
        modified.push({ id, fork: fModel, reference: rModel, diff: fieldDiff });
      }
    }
  }

  return { added, removed, modified };
}

export function getAvailableProviderCategories(providers = loadAvailableProviders()) {
  return [...new Set(providers.map((provider) => provider.category))].sort(compareStrings);
}

export function getProviderDisplayName(providerId) {
  return COMMON_PROVIDERS.find((provider) => provider.id === providerId)?.name || providerId;
}

export function formatProviderChoices() {
  return COMMON_PROVIDERS.map((provider, index) => `${index + 1}. ${provider.name}`).join("\n");
}

export function resolveProviderChoice(value) {
  const trimmed = String(value || "").trim();
  const numeric = Number.parseInt(trimmed, 10);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= COMMON_PROVIDERS.length) {
    return COMMON_PROVIDERS[numeric - 1].id;
  }
  return trimmed || "openai";
}
