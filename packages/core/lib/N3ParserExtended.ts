/*! @license MIT ©2026 Ghent University - imec */
/* Wraps n3's Parser to expose a couple of undocumented internals this
   codebase relies on (confirmed via n3's own source, lib/N3Parser.js):
   an instance `_prefixes` map, and a static `_resetBlankNodePrefix`.
   Also widens `parse`'s input type beyond the string-only signature
   @types/n3 declares, to the actual stream shape N3Lexer accepts. */

import { Parser as N3Parser } from 'n3';
import type { BaseQuad, ParseCallback, Quad } from 'n3';

// The shape N3Lexer.tokenize's stream branch actually consumes (lib/N3Lexer.js).
interface N3ParseableInput {
  setEncoding?(encoding: string): void;
  on(event: 'data', listener: (chunk: any) => void): this;
  on(event: 'end', listener: () => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
}

interface ParserPrefixInternals {
  _prefixes: Record<string, string>;
}

interface ParserConstructorInternals {
  _resetBlankNodePrefix(): void;
}

export class N3ParserExtended<Q extends BaseQuad = Quad> extends N3Parser<Q> {
  get prefixMap(): Record<string, string> {
    return (this as unknown as ParserPrefixInternals)._prefixes;
  }

  override parse(input: string): Q[];
  override parse(input: string, callback: ParseCallback<Q>): void;
  override parse(input: N3ParseableInput, callback: ParseCallback<Q>): void;
  override parse(input: string | N3ParseableInput, callback?: ParseCallback<Q>): Q[] | void {
    return super.parse(input as any, callback as any);
  }

  static resetBlankNodePrefix(): void {
    (N3Parser as unknown as ParserConstructorInternals)._resetBlankNodePrefix();
  }
}
