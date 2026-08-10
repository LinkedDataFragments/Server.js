/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

// Escapes a string for use in a regular expression
export function toRegExp(string: string): string {
  return string.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}

// The MIME type for plaintext
export const MIME_PLAINTEXT = 'text/plain;charset=utf-8';

// Normalizes an unknown catch-clause value into an Error, preserving a
// non-Error throw as `cause` rather than discarding it
export function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value), { cause: value });
}

// A constructor for a custom Error subtype, as produced by createErrorType
export type ErrorTypeConstructor = new (message?: string) => Error;

type ErrorInit = (this: Error, ...args: any[]) => void;

// ErrorType is callable both with and without `new` (this instanceof check below),
// so it needs both a call and a construct signature.
interface ErrorTypeFn {
  (this: Error, message?: string, ...rest: any[]): Error;
  new (message?: string, ...rest: any[]): Error;
  prototype: Error;
}

// Creates a specific type of error
export function createErrorType(name: string, init?: ErrorInit): ErrorTypeConstructor;
export function createErrorType(BaseError: ErrorConstructor, name: string, init?: ErrorInit): ErrorTypeConstructor;
export function createErrorType(
  baseErrorOrName: ErrorConstructor | string,
  nameOrInit?: string | ErrorInit,
  maybeInit?: ErrorInit,
): ErrorTypeConstructor {
  let BaseError: ErrorConstructor;
  let name: string;
  let init: ErrorInit | undefined;
  if (typeof baseErrorOrName === 'string') {
    BaseError = Error;
    name = baseErrorOrName;
    init = nameOrInit as ErrorInit | undefined;
  }
  else {
    BaseError = baseErrorOrName;
    name = nameOrInit as string;
    init = maybeInit;
  }

  function ErrorType(this: Error, message?: string, ...rest: any[]) {
    const error: Error = this instanceof ErrorType ? this : new (ErrorType as ErrorTypeFn)(message, ...rest);
    error.name = name;
    error.message = message || '';
    Error.captureStackTrace(error, error.constructor);
    init && init.apply(error, [message, ...rest]);
    return error;
  }
  ErrorType.prototype = new BaseError();
  ErrorType.prototype.name = name;
  ErrorType.prototype.constructor = ErrorType;
  return ErrorType as ErrorTypeFn;
}
