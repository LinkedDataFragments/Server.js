/*! @license MIT ©2016 Miel Vander Sande, Ghent University - imec */
/* A WebIDControllerExtension extends Triple Pattern Fragments responses with WebID authentication. */

import * as http from 'http';
import type { TLSSocket } from 'tls';
import parseCacheControl = require('parse-cache-control');
import * as N3 from 'n3';
import Controller = require('@ldf/core/lib/controllers/Controller');
import UrlData = require('@ldf/core/lib/UrlData');
import Util = require('@ldf/core/lib/Util');
import type { ControllerOptions, LdfRequest, LdfResponse } from '@ldf/core/lib/types';

const n3parser = N3.Parser;

let CERT_NS = 'http://www.w3.org/ns/auth/cert#';

interface CachedId {
  modulus?: string;
  exponent?: number;
}

interface WebIdCache {
  get(key: string): CachedId | undefined;
  set(key: string, value: CachedId, maxAge?: number): void;
}
const lru: (max: number) => WebIdCache = require('lru-cache');

interface ForbiddenOptions {
  webID?: string;
  reason?: string;
}

// Creates a new WebIDControllerExtensionsl
class WebIDControllerExtension extends Controller {
  protected _cache: WebIdCache;
  protected _protocol?: string;

  constructor(settings: ControllerOptions) {
    super(settings);
    this._cache = lru(50);
    this._protocol = (settings.urlData || new UrlData()).protocol;
  }

  // Add WebID Link headers
  protected override _handleRequest(request: LdfRequest, response: LdfResponse, next: (error?: Error) => void, settings?: ControllerOptions): void {
    // Get WebID from certificate
    if (this._protocol !== 'https') // This WebID implementation requires HTTPS
      return next();

    let self = this,
        certificate = (request.connection as unknown as TLSSocket).getPeerCertificate();

    if (!(certificate.subject && certificate.subject.subjectAltName)) {
      return this._handleForbidden(request, response, {
        reason: 'No WebID found in client certificate.',
      });
    }

    let webID = (certificate.subject.subjectAltName as string).replace('uniformResourceIdentifier:', '');
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
    let parser: N3.Parser = (n3parser as unknown as () => N3.Parser)(),
        id: CachedId = {};

    // parse webID
    function parseTriple(error: Error, triple: N3.Quad, prefixes?: N3.Prefixes) {
      if (error)
        callback('Cannot parse WebID: ' + String(error));
      else if (triple) {
        switch (triple.predicate as any) {
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
        callback(null, false, 'WebID does not match certificate: ' + (m as string) + ' - ' + (e as number) + ' (webid) <> ' + (modulus as string) + ' - ' + exponent + ' (cert)');
    }

    // Try to get WebID from cache
    let cachedId = this._cache.get(webID);

    if (cachedId)
      verify(cachedId.modulus, cachedId.exponent);
    else {
      let req = http.request(webID, (res) => {
        res.setEncoding('utf8');

        parser.parse(res as any, parseTriple);

        res.on('end', () => {
          let cacheControl = parseCacheControl(res.headers['Cache-Control'] as string || '');
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

  protected override _handleNotAcceptable(request: LdfRequest, response: LdfResponse, options: (error?: Error) => void): void {
    response.writeHead(401, {
      'Content-Type': Util.MIME_PLAINTEXT,
    });
    response.end('Access to ' + (request.url as string) + ' is not allowed, verification for WebID ' + ((options as unknown as { webID?: string; reason?: string }).webID || '') + ' failed. Reason: ' + ((options as unknown as { webID?: string; reason?: string }).reason || ''));
  }
}

export = WebIDControllerExtension;
