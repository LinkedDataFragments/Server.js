// type declarations for dependencies that ship no types of their own
// and have no @types package on npm.

declare module 'forwarded-parse' {
  interface ForwardedElement {
    by?: string;
    for?: string;
    host?: string;
    proto?: string;
  }
  function parseForwarded(header: string): ForwardedElement[];
  export = parseForwarded;
}

declare module 'negotiate' {
  interface Negotiate {
    choose<T extends { type: string; responseType: string; quality: number }>(
      candidates: T[],
      request: { headers: import('http').IncomingHttpHeaders },
    ): T[];
  }
  const negotiate: Negotiate;
  export = negotiate;
}

declare module 'qejs' {
  import Q = require('q');
  interface Qejs {
    renderFile(fileName: string, options: any): Q.Promise<string>;
  }
  const qejs: Qejs;
  export = qejs;
}

declare module 'access-log' {
  const accessLog: any;
  export = accessLog;
}

// lru-cache v5 (what's actually installed and used here) ships no types of
// its own, while a newer, API-incompatible v11 hoisted at the monorepo root
// does — so without this shim, TS would resolve to and check against v11.
declare module 'lru-cache' {
  interface Options<K, V> {
    max?: number;
    maxAge?: number;
    length?(value: V, key?: K): number;
    dispose?(key: K, value: V): void;
    stale?: boolean;
  }
  class LRUCache<K, V> {
    constructor(options?: Options<K, V> | number);
    get(key: K): V | undefined;
    set(key: K, value: V, maxAge?: number): boolean;
    has(key: K): boolean;
    del(key: K): void;
    reset(): void;
  }
  export = LRUCache;
}
