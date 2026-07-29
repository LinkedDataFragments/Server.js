// n3's Parser has a couple of undocumented internals this codebase relies on,
// confirmed by reading n3's own source (lib/N3Parser.js): an instance-level
// `_prefixes` map (used to name blank nodes consistently), and a static
// `_resetBlankNodePrefix` used to reset the counter shared across parses.
import type { BaseQuad, Quad } from 'n3';

declare module 'n3' {
  export interface Parser<Q extends BaseQuad = Quad> {
    _prefixes: Record<string, string>;
  }
  export namespace Parser {
    function _resetBlankNodePrefix(): void;
  }
}
