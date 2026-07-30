// n3's Parser has a couple of undocumented internals this codebase relies on,
// confirmed by reading n3's own source (lib/N3Parser.js): an instance-level
// `_prefixes` map (used to name blank nodes consistently), and a static
// `_resetBlankNodePrefix` used to reset the counter shared across parses.
import type { BaseQuad, ParseCallback, Quad } from 'n3';

// Matches what N3Lexer.tokenize's stream branch actually calls on its input
// (lib/N3Lexer.js): optional setEncoding, plus 'data'/'end'/'error' events —
// satisfied by both a real Readable and a plain EventEmitter.
interface N3ParseableInput {
  setEncoding?(encoding: string): void;
  on(event: 'data', listener: (chunk: any) => void): this;
  on(event: 'end', listener: () => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
}

declare module 'n3' {
  export interface Parser<Q extends BaseQuad = Quad> {
    _prefixes: Record<string, string>;
    parse(input: N3ParseableInput, callback: ParseCallback<Q>): void;
  }
  export namespace Parser {
    function _resetBlankNodePrefix(): void;
  }
}
