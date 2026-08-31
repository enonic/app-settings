/**
 * The server tsconfig carries no node types (XP runs GraalJS), but `*.test.ts` beside the server
 * modules runs under vitest on node — the server tsconfig includes this test-owned file, and only
 * what a test needs is declared.
 */
declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf8'): string;
}
