/*! @license MIT ©2014-2017 Ruben Verborgh and Ruben Taelman, Ghent University - imec */
/* A SparqlDatasource provides queryable access to a SPARQL endpoint. */

import { Datasource } from '@ldf/core/lib/datasources/Datasource';
import { SparqlJsonParser } from 'sparqljson-parse';
import LRU = require('lru-cache');
import type { IBindings } from 'sparqljson-parse';
import type { Literal, NamedNode, Quad, Quad_Graph, Quad_Object, Quad_Predicate, Quad_Subject, Term } from 'rdf-js';
import type { BufferedIterator } from 'asynciterator';
import type { DatasourceOptions, Pushable, Query } from '@ldf/core';

interface SparqlDatasourceOptions extends DatasourceOptions {
  endpoint?: string;
  forceTypedLiterals?: boolean;
}

interface CountEstimate {
  totalCount: number;
  hasExactCount: boolean;
}

let DEFAULT_COUNT_ESTIMATE: CountEstimate = { totalCount: 1e9, hasExactCount: false };
let ENDPOINT_ERROR = 'Error accessing SPARQL endpoint';
let INVALID_JSON_RESPONSE = 'The endpoint returned an invalid SPARQL results JSON response.';
const xsd  = 'http://www.w3.org/2001/XMLSchema#';

// Creates a new SparqlDatasource
export class SparqlDatasource extends Datasource {
  protected _countCache: LRU<string, number>;
  protected _resolvingCountQueries: Record<string, boolean>;
  protected _sparqlJsonParser: SparqlJsonParser;
  protected _endpoint: string;
  protected _endpointUrl: string;
  protected _forceTypedLiterals?: boolean;

  constructor(options: SparqlDatasourceOptions) {
    let supportedFeatureList = ['quadPattern', 'triplePattern', 'limit', 'offset', 'totalCount'];
    super(options, supportedFeatureList);

    this._countCache = new LRU<string, number>({ max: 1000, maxAge: 1000 * 60 * 60 * 3 });
    this._resolvingCountQueries = {};
    this._sparqlJsonParser = new SparqlJsonParser({ dataFactory: this.dataFactory });

    // Set endpoint URL and default graph
    options = options || {};
    this._endpoint = this._endpointUrl = (options.endpoint || '').replace(/[\?#][^]*$/, '');
    this._endpointUrl += '?query=';

    this._forceTypedLiterals = options.forceTypedLiterals;
  }

  // Writes the results of the query to the given triple stream
  protected override _executeQuery(query: Query, destination: BufferedIterator<Quad>): void {
    // Create the HTTP request
    let sparqlPattern = this._createQuadPattern(query), self = this,
        selectQuery = this._createSelectQuery(sparqlPattern, query.offset, query.limit),
        request = { url: this._endpointUrl + encodeURIComponent(selectQuery),
          headers: { accept: 'application/sparql-results+json' },
        };

    // Fetch and parse matching triples using JSON responses
    let json = '';
    this._request(request, emitError)
      .on('data', (data: string) => { json += data; })
      .on('error', emitError)
      .on('end', () => {
        let response: { results: { bindings: unknown[] } };
        try { response = JSON.parse(json); }
        catch (e) { return emitError({ message: INVALID_JSON_RESPONSE }); }

        response.results.bindings.forEach((rawBinding) => {
          const binding: IBindings = this._sparqlJsonParser.parseJsonBindings(rawBinding);
          let triple = this.dataFactory.quad(
            (binding.s || query.subject) as Quad_Subject,
            (binding.p || query.predicate) as Quad_Predicate,
            (binding.o || query.object) as Quad_Object,
            (binding.g || query.graph) as Quad_Graph | undefined,
          );
          (destination as Pushable<Quad>)._push(triple);
        });
        destination.close();
      });

    // Determine the total number of matching triples
    this._getPatternCount(sparqlPattern).then((count) => {
      destination.setProperty('metadata', count);
    },
    emitError);

    // Emits an error on the triple stream
    let errored = false;
    function emitError(error?: { message: string }) {
      if (!error || errored) return;
      errored = true;
      destination.emit('error', new Error(ENDPOINT_ERROR + ' ' + self._endpoint + ': ' + error.message));
    }
  }

  // Retrieves the (approximate) number of triples that match the SPARQL pattern
  protected _getPatternCount(sparqlPattern: string): Promise<CountEstimate> {
    // Try to find a cache match
    let cache = this._countCache, count = cache.get(sparqlPattern);
    if (count)
      return Promise.resolve({ totalCount: count, hasExactCount: true });

    // Immediately return the fallback URL if a count is already going on.
    if (this._resolvingCountQueries[sparqlPattern])
      return Promise.resolve(DEFAULT_COUNT_ESTIMATE);

    // Execute the count query
    let countResponse = this._request({
      url: this._endpointUrl + encodeURIComponent(this._createCountQuery(sparqlPattern)),
      headers: { accept: 'text/csv' },
      timeout: 10000,
    });

    // Parse SPARQL response in CSV format (2 lines: variable name / count value)
    return new Promise((resolve, reject) => {
      let csv = '';
      this._resolvingCountQueries[sparqlPattern] = true;
      countResponse.on('data', (data: string) => { csv += data; });
      countResponse.on('end', () => {
        delete this._resolvingCountQueries[sparqlPattern];
        let countMatch = csv.match(/\d+/);
        if (!countMatch)
          reject(new Error('COUNT query failed.'));
        else {
          let count = parseInt(countMatch[0], 10);
          // Cache large values; small ones are calculated fast anyway
          if (count > 100000)
            cache.set(sparqlPattern, count);
          resolve({ totalCount: count, hasExactCount: true });
        }
      });
      // If the response errors, use an arbitrarily high number as count
      countResponse.on('error', resolveToDefault);
      function resolveToDefault() { resolve(DEFAULT_COUNT_ESTIMATE); }
      // When no result arrives in time, send a default count
      // (the correct result might still end up in the cache for future use)
      setTimeout(resolveToDefault, 3000);
    });
  }

  // Creates a SELECT query from the given SPARQL pattern
  protected _createSelectQuery(sparqlPattern: string, offset?: number, limit?: number): string {
    let query = ['SELECT * WHERE', sparqlPattern];
    // Even though the SPARQL spec indicates that
    // LIMIT and OFFSET might be meaningless without ORDER BY,
    // this doesn't seem a problem in practice.
    // Furthermore, sorting can be slow. Therefore, don't sort.
    limit && query.push('LIMIT', String(limit));
    offset && query.push('OFFSET', String(offset));
    return query.join(' ');
  }

  // Creates a SELECT COUNT(*) query from the given SPARQL pattern
  protected _createCountQuery(sparqlPattern: string): string {
    return 'SELECT (COUNT(*) AS ?c) WHERE ' + sparqlPattern;
  }

  // Creates a SPARQL pattern for the given triple pattern
  protected _createQuadPattern(quad: Query): string {
    let query = ['{'];

    // Encapsulate in graph if we are not querying the default graph
    if (!quad.graph || quad.graph.termType !== 'DefaultGraph') {
      query.push('GRAPH ');
      quad.graph ? query.push(this._encodeObject(quad.graph) ?? '') : query.push('?g');
      query.push('{');
    }

    // Add a possible subject IRI
    quad.subject ? query.push((this._encodeObject(quad.subject) ?? '') + ' ') : query.push('?s ');

    // Add a possible predicate IRI
    quad.predicate ? query.push((this._encodeObject(quad.predicate) ?? '') + ' ') : query.push('?p ');

    // Add a possible object IRI
    quad.object ? query.push(this._encodeObject(quad.object) ?? '') : query.push('?o');

    if (!quad.graph || quad.graph.termType !== 'DefaultGraph')
      query.push('}'); // close the GRAPH brackets

    return query.push('}'), query.join('');
  }

  protected _encodeObject(term: NamedNode): string;
  protected _encodeObject(term: Term): string | null;
  protected _encodeObject(term: Term): string | null {
    switch (term.termType) {
    case 'NamedNode':
      return '<' + term.value + '>';
    case 'BlankNode':
      return '_:' + term.value;
    case 'Variable':
      return '?' + term.value;
    case 'DefaultGraph':
      return '';
    case 'Literal':
      return this._convertLiteral(term);
    default:
      return null;
    }
  }

  protected _convertLiteral(term?: Literal): string {
    if (!term)
      return '?o';
    else {
      return ((!/["\\]/.test(term.value)) ?  '"' + term.value + '"' : '"""' + term.value.replace(/(["\\])/g, '\\$1') + '"""') +
        (term.language ? '@' + term.language :
          (term.datatype && term.datatype.value !== xsd + 'string' ? '^^' + this._encodeObject(term.datatype) : this._forceTypedLiterals ? '^^<http://www.w3.org/2001/XMLSchema#string>' : ''));
    }
  }
}

