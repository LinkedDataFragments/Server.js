/*! @license MIT ©2016 Miel Vander Sande, Ghent University - imec */
/* A WebIDControllerExtension extends Triple Pattern Fragments responses with WebID authentication. */

import * as http from 'http';
import { TLSSocket } from 'tls';
import type { Socket } from 'net';
import parseCacheControl = require('parse-cache-control');
import { N3ParserExtended as N3Parser } from '@ldf/core/lib/N3ParserExtended';
import { Controller } from '@ldf/core/lib/controllers/Controller';
import { UrlData } from '@ldf/core/lib/UrlData';
import * as Util from '@ldf/core/lib/Util';
import LRU = require('lru-cache');
import type { Quad as N3Quad, Prefixes as N3Prefixes } from 'n3';
import type { ControllerOptions, LdfRequest, LdfResponse } from '@ldf/core';

let CERT_NS = 'http://www.w3.org/ns/auth/cert#';

interface CachedId {
  modulus?: string;
  exponent?: number;
}

interface ForbiddenOptions {
  webID?: string;
  reason?: string;
}

// Asserts that a socket is a TLS socket, as required to read a peer certificate from it
function assertTlsSocket(socket: Socket): asserts socket is TLSSocket {
  if (!(socket instanceof TLSSocket))
    throw new Error('Expected a TLS connection, but the socket is not a TLSSocket.');
}

// Creates a new WebIDControllerExtensionsl
export class WebIDControllerExtension extends Controller {
  protected _cache: LRU<string, CachedId>;
  protected _protocol?: string;

  constructor(settings: ControllerOptions) {
    super(settings);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    this._cache = require('lru-cache')(50);
    this._protocol = (settings.urlData || new UrlData()).protocol;
  }

  // Add WebID Link headers
  protected override _handleRequest(request: LdfRequest, response: LdfResponse, next: (error?: Error) => void, settings?: ControllerOptions): void {
    // Get WebID from certificate
    if (this._protocol !== 'https') // This WebID implementation requires HTTPS
      return next();

    assertTlsSocket(request.connection);

    let self = this,
        certificate = request.connection.getPeerCertificate();

    if (!(certificate.subject && typeof certificate.subject.subjectAltName === 'string')) {
      return this._handleForbidden(request, response, {
        reason: 'No WebID found in client certificate.',
      });
    }

    let webID = certificate.subject.subjectAltName.replace('uniformResourceIdentifier:', '');
    this._verifyWebID(webID, certificate.modulus, parseInt(certificate.exponent!, 16),
      (error: string | null, verified?: boolean, reason?: string) => {
        if (!verified) {
          return self._handleForbidden(request, response, {
            webID: webID,
            reason: reason,
          });
        }
        next();
      });
  }

  // Verify webID
  protected _verifyWebID(webID: string, modulus: string | undefined, exponent: number, callback: (error: string | null, verified?: boolean, reason?: string) => void): void {
    // request & parse
    let parser = new N3Parser(),
        id: CachedId = {};

    // parse webID
    function parseTriple(error: Error, triple: N3Quad, prefixes?: N3Prefixes) {
      if (error)
        callback('Cannot parse WebID: ' + String(error));
      else if (triple) {
        switch (triple.predicate as unknown) {
        case CERT_NS + 'modulus':
          // Add modulus
          const literalValue = triple.object.value;
          // Apply parsing method by nodejs
          id.modulus = literalValue.slice(literalValue.indexOf('00:') === 0 ? 3 : 0).replace(/:/g, '').toUpperCase();
          break;
        case CERT_NS + 'exponent':
          // Add exponent
          id.exponent = parseInt(triple.object.value, 10);
          break;
        }
      }
    }

    function verify(m?: string, e?: number) {
      if (m && m === modulus && e && e === exponent)
        callback(null, true);
      else
        callback(null, false, 'WebID does not match certificate: ' + String(m) + ' - ' + String(e) + ' (webid) <> ' + String(modulus) + ' - ' + exponent + ' (cert)');
    }

    // Try to get WebID from cache
    let cachedId = this._cache.get(webID);

    if (cachedId)
      verify(cachedId.modulus, cachedId.exponent);
    else {
      let req = http.request(webID, (res) => {
        res.setEncoding('utf8');

        parser.parse(res, parseTriple);

        res.on('end', () => {
          let cacheControl = parseCacheControl((res.headers['Cache-Control'] as string | undefined) || '');
          this._cache.set(webID, id, cacheControl && cacheControl['max-age'] || 0);
          verify(id.modulus, id.exponent);
        });
      });

      req.on('error', (e: Error) => {
        callback(null, false, 'Unabled to download ' + webID + ' (' + e.message + ').');
      });

      req.end();
    }
  }

  protected _handleForbidden(request: LdfRequest, response: LdfResponse, options: ForbiddenOptions): void {
    // Render the 404 message using the appropriate view
    let view = this._negotiateView('Forbidden', request, response),
        metadata = {
          url: request.url,
          prefixes: this._prefixes,
          datasources: this._datasources,
          reason: options.reason,
        };
    response.writeHead(401);
    view.render(metadata, request, response);
  }

  protected override _handleNotAcceptable(request: LdfRequest, response: LdfResponse, options: ((error?: Error) => void) | ForbiddenOptions): void {
    response.writeHead(401, {
      'Content-Type': Util.MIME_PLAINTEXT,
    });
    const forbidden = typeof options === 'function' ? {} : options;
    response.end('Access to ' + String(request.url) + ' is not allowed, verification for WebID ' + (forbidden.webID || '') + ' failed. Reason: ' + (forbidden.reason || ''));
  }
}

