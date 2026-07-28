/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */

// Escapes a string for use in a regular expression
export function toRegExp(string: string): string {
  return string.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}

// The MIME type for plaintext
export const MIME_PLAINTEXT = 'text/plain;charset=utf-8';

// A constructor for a custom Error subtype, as produced by createErrorType
export type ErrorTypeConstructor = new (message?: string) => Error;

type ErrorInit = (this: Error, ...args: any[]) => void;

// Creates a specific type of error
export function createErrorType(name: string, init?: ErrorInit): ErrorTypeConstructor;
export function createErrorType(BaseError: ErrorConstructor, name: string, init?: ErrorInit): ErrorTypeConstructor;
export function createErrorType(
  BaseError: ErrorConstructor | string,
  name?: string | ErrorInit,
  init?: ErrorInit,
): ErrorTypeConstructor {
  if (typeof BaseError !== 'function') {
    init = name as ErrorInit;
    name = BaseError;
    BaseError = Error;
  }
  const errorName = name as string;
  // The prototype-chain rewiring below has no static TS representation,
  // since ErrorType's shape changes at runtime to match BaseError.
  function ErrorType(this: Error, message?: string, ...rest: any[]) {
    const error: any = this instanceof ErrorType ? this : new (ErrorType as any)(message, ...rest);
    error.name = errorName;
    error.message = message || '';
    Error.captureStackTrace(error, error.constructor);
    init && init.apply(error, [message, ...rest]);
    return error;
  }
  ErrorType.prototype = new (BaseError as ErrorConstructor)();
  ErrorType.prototype.name = errorName;
  ErrorType.prototype.constructor = ErrorType;
  return ErrorType as unknown as ErrorTypeConstructor;
}
