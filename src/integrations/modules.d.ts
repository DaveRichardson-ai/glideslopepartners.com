declare module '*/guards.mjs' {
  export function findPlaceholders(html: string): string[];
}
declare module '*/tokens.mjs' {
  export function tokensToCss(tokens: unknown): string;
  export function loadTokensCss(): string;
}
