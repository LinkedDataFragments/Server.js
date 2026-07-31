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
