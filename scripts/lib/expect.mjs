// tests.json expectations, with the semantics of the app's ExtensionConformanceTests.check:
// dotted paths (`mangas.0.title`, `length` for arrays, "" for the whole result) mapped to a value
// or to {"contains": text}, {"gt": number} or {"localDate": "yyyy-MM-dd"}.

/** Calls the app's conformance test understands. `filters` is debug-only. */
export const TEST_CALLS = ["popular", "latest", "search", "details", "chapters", "mangaUpdate", "pages", "imageURL", "imageTransform"];
export const OPERATORS = ["contains", "gt", "localDate"];

export function resolvePath(value, path) {
  if (path === "") return value;
  let current = value;
  for (const key of path.split(".")) {
    if (Array.isArray(current)) {
      if (key === "length") current = current.length;
      else if (/^\d+$/.test(key) && Number(key) < current.length) current = current[Number(key)];
      else return undefined;
    } else if (current && typeof current === "object") {
      current = current[key] ?? undefined;
    } else {
      return undefined;
    }
  }
  return current;
}

/** NSObject.isEqual on JSON values: numbers and booleans compare as NSNumbers. */
function equal(actual, expected) {
  // Only the whole result can be null (NSNull); a null field resolves to nil, which never matches.
  if (actual === null) return expected === null;
  if (actual === undefined) return false;
  const numeric = (value) => (typeof value === "boolean" ? Number(value) : value);
  if ((typeof actual === "number" || typeof actual === "boolean") && (typeof expected === "number" || typeof expected === "boolean")) {
    return numeric(actual) === numeric(expected);
  }
  if (Array.isArray(actual) || Array.isArray(expected)) {
    return Array.isArray(actual) && Array.isArray(expected) && actual.length === expected.length && actual.every((item, index) => equal(item, expected[index]));
  }
  if (typeof actual === "object" && typeof expected === "object" && expected !== null) {
    const keys = Object.keys(expected);
    const actualKeys = Object.keys(actual).filter((key) => actual[key] !== null);
    return keys.length === actualKeys.length && keys.every((key) => equal(actual[key], expected[key]));
  }
  return actual === expected;
}

function localDate(millis) {
  const date = new Date(Number(millis) || 0);
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const show = (value) => (value === undefined ? "nil" : JSON.stringify(value));

/** Returns a list of failure messages (empty when everything matches). */
export function checkExpectations(result, expect) {
  const failures = [];
  for (const path of Object.keys(expect).sort()) {
    const expected = expect[path];
    const actual = resolvePath(result, path);
    const label = path === "" ? "result" : path;
    const operation = expected && typeof expected === "object" && !Array.isArray(expected) ? Object.entries(expected) : null;
    if (operation && operation.length === 1 && OPERATORS.includes(operation[0][0])) {
      const [name, operand] = operation[0];
      if (name === "contains" && !(typeof actual === "string" && actual.includes(String(operand)))) {
        failures.push(`${label} = ${show(actual)} should contain ${show(operand)}`);
      } else if (name === "gt" && !(typeof actual === "number" && actual > Number(operand))) {
        failures.push(`${label} = ${show(actual)} should be > ${operand}`);
      } else if (name === "localDate" && localDate(actual) !== operand) {
        failures.push(`${label} is ${localDate(actual)}, expected ${operand}`);
      }
      continue;
    }
    if (operation && operation.length === 1 && !OPERATORS.includes(operation[0][0]) && Object.keys(expected).length === 1) {
      failures.push(`Unknown expectation ${operation[0][0]} for ${label}`);
      continue;
    }
    if (!equal(actual, expected)) failures.push(`${label} = ${show(actual)}, expected ${show(expected)}`);
  }
  return failures;
}
