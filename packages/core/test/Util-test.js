/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
import { describe, it, expect } from 'vitest';
let Util = require('../lib/Util');

describe('Util', () => {
  describe('toRegExp', () => {
    it('should escape regular expression special characters', () => {
      expect(Util.toRegExp('a-[b].{c}(d)*e+f?g.h\\i^j$k|l')).toBe('a\\-\\[b\\]\\.\\{c\\}\\(d\\)\\*e\\+f\\?g\\.h\\\\i\\^j\\$k\\|l');
    });

    it('should leave a string without special characters untouched', () => {
      expect(Util.toRegExp('abcdef')).toBe('abcdef');
    });
  });

  describe('toError', () => {
    it('should return an Error unchanged', () => {
      let error = new Error('original');
      expect(Util.toError(error)).toBe(error);
    });

    it('should wrap a non-Error value in an Error, preserving it as cause', () => {
      let wrapped = Util.toError('not an error');
      expect(wrapped).toBeInstanceOf(Error);
      expect(wrapped.message).toBe('not an error');
      expect(wrapped.cause).toBe('not an error');
    });
  });

  describe('createErrorType', () => {
    it('should create an Error subtype callable with new', () => {
      let MyError = Util.createErrorType('MyError');
      let error = new MyError('oops');
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('MyError');
      expect(error.message).toBe('oops');
    });

    it('should create an Error subtype callable without new', () => {
      let MyError = Util.createErrorType('MyError');
      // eslint-disable-next-line new-cap
      let error = MyError('oops');
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('MyError');
      expect(error.message).toBe('oops');
    });

    it('should base the error type on a custom base error class when given one', () => {
      class CustomBaseError extends Error {}
      let MyError = Util.createErrorType(CustomBaseError, 'MyError');
      let error = new MyError('oops');
      expect(error).toBeInstanceOf(CustomBaseError);
      expect(error.name).toBe('MyError');
    });

    it('should default the message to an empty string when none is given', () => {
      let MyError = Util.createErrorType('MyError');
      let error = new MyError();
      expect(error.message).toBe('');
    });

    it('should call the given init function with the constructor arguments', () => {
      let received;
      let MyError = Util.createErrorType('MyError', (message, extra) => { received = extra; });
      // eslint-disable-next-line no-new
      new MyError('oops', 'extra-detail');
      expect(received).toBe('extra-detail');
    });
  });
});
