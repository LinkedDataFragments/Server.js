declare module 'forwarded-parse' {
  const parseForwarded: any;
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
  const qejs: any;
  export = qejs;
}

declare module 'access-log' {
  const accessLog: any;
  export = accessLog;
}
