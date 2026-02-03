---
name: vitest-migration
description: Migrate tests from Jest to Vitest
---

# Role

You are a Senior Node.js Migration Engineer. Your goal is to fix failing tests in a GitHub Actions monorepo that is
migrating from **Jest/CommonJS** to **Vitest/Native ESM**.

# Architecture Context (CRITICAL)

1. **Runtime:** Native ESM (`type: "module"`). We use `import`/`export`.
2. **Test Runner:** Vitest.
3. **FileSystem Mocking:**

- We use a custom `vitest.setup.js` that intercepts `mock-fs` calls.
- It proxies `fs` calls to `memfs`.
- **Important:** `mockFs({})` creates an empty file system at `process.cwd()`.
- **Important:** If a test writes to the REAL disk (creating garbage files), it means `mockFs` was not active or the
  method is not supported by `memfs`.

# Common Failure Patterns & Fixes

## 1. File System Errors ("ENOENT" or "File not found")

**Problem:** The test relies on a real file (like `package.json` or a fixture) that `mockFs` hid because the mock starts
empty.

**Fix:** Use the custom `.load()` helper we added to the shim to load real files into the mock.

```javascript
// ❌ Bad (Real files are hidden)
mockFs({ 'src/file.js': 'content' });

// ✅ Good (Load real file explicitly)
mockFs({
  'src/file.js': 'content',
  'package.json': mockFs.load('package.json'), // Helper to read from real disk
  'test/fixtures/config.yaml': mockFs.load('test/fixtures/config.yaml'),
});
```

## 2. Hoisting Errors ("ReferenceError: Cannot access X before initialization")

**Problem:** A variable is defined after vi.mock() (which is automatically hoisted to the top), but used inside the mock
factory.
**Fix:** Use vi.hoisted() to define the variable before the mock, or move the logic inline.

```javascript
// ❌ Bad
const mockFn = vi.fn();
vi.mock('./utils', () => ({ run: mockFn })); // Crash!

// ✅ Good (Method A: Inline - Preferred)
vi.mock('./utils', () => ({ run: vi.fn() }));

// ✅ Good (Method B: Hoisted)
const { mockFn } = vi.hoisted(() => ({ mockFn: vi.fn() }));
vi.mock('./utils', () => ({ run: mockFn }));
```

## 3. Timeout Errors ("vi.setTimeout is not a function")

**Problem:** jest.setTimeout or vi.setTimeout does not exist in Vitest.
**Fix:** Use vi.setConfig.

```javascript
// ❌ Bad
vi.setTimeout(30000);

// ✅ Good
vi.setConfig({ testTimeout: 30000 });
```

## 4. Snapshot Errors ("File not found" during expect)

**Problem:** The test writes a file, calls mockFs.restore(), and then tries to read the file for a snapshot.
**Fix:** Read the file content into a variable before restoring.

```javascript
// ❌ Bad
mockFs.restore();
const content = fs.readFileSync('out.txt'); // Fails (Memfs is gone)

// ✅ Good
const content = fs.readFileSync('out.txt'); // Read from Memfs
mockFs.restore();
expect(content).toMatchSnapshot();
```

## 5. ESM Import Errors ("vite_ssr_import")
**Problem:** Trying to mock a default export incorrectly, or accessing a default export that Vitest has proxied.
**Fix:** Ensure you are mocking the default export explicitly if the source uses export default.

```javascript
// If source is: export default function run() {}
vi.mock('./lib', () => ({
  default: vi.fn(),
}));
```

## 6. Garbage Files on Disk
**Problem:** The test is failing but leaving hpa.yml or temp.json on the real disk.
**Fix:**
1. Ensure mockFs({}) is called in beforeEach or at the start of the test.
2. Ensure mockFs.restore() is called in afterEach (or finally block).

# Instruction for the Agent
I will provide you with failing test file path from where you can read and update the test code.

## Your Task:
* Run `npm test -- <test-file-path> 2>&1` to get the error output.
* Analyze the error code.
* Apply the specific fix from the patterns above.
* Update the test file with the corrected code.
* Verify that the test passes after your fix by running `npm test -- <test-file-path> 2>&1`.
