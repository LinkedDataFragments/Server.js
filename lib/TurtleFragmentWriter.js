/*! @license ©2013 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A TurtleFragmentWriter represents a basic Linked Data Fragment as Turtle. */

var N3 = require('n3'),
    UriTemplate = require('uritemplate');

var dcterms = 'http://purl.org/dc/terms/',
    rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    rdfs = 'http://www.w3.org/2000/01/rdf-schema#',
    xsd = 'http://www.w3.org/2001/XMLSchema#',
    hydra = 'http://www.w3.org/ns/hydra/core#',
    voID = 'http://rdfs.org/ns/void#';

// Creates a new TurtleFragmentWriter
function TurtleFragmentWriter(outputStream, options) {
  options = options || {};
  this._datasetName = options.dataset;
  this._dataset = options.datasetURL;
  this._fragment = options.fragmentURL;
  this._pattern = options.pattern;
  this._prefixes = options.prefixes;

  // Only create the writer when accessed so we don't start writing too soon
  var writer;
  Object.defineProperty(this, '_writer', {
    get: function () { return writer || (writer = this._createWriter(outputStream)); },
  });
}

TurtleFragmentWriter.prototype = {
  // Writes the specified triple
  writeTriple: function (triple) {
    this._writer.addTriple(triple);
  },

  // Writes the fragment metadata
  writeMetadata: function (count) {
    if (this._metadataWritten) return;
    this._metadataWritten = true;

    var writer = this._writer, addTriple = function (s, p, o) { writer.addTriple(s, p, o); },
        // Dataset, fragment and pattern metadata
        datasetName = this._datasetName, dataset = this._dataset,
        fragment = this._fragment, pattern = this._pattern,
        subject = pattern.subject, predicate = pattern.predicate, object = pattern.object,
        subjectURI = subject && ('<' + subject + '>'),
        predicateURI = predicate && ('<' + predicate + '>'),
        objectIsLiteral = N3.Util.isLiteral(object),
        objectURI = object && (objectIsLiteral ? object : '<' + object + '>'),
        patternString = ['{', subjectURI || '?s', predicateURI || '?p', objectURI || '?o', '}'].join(' '),
        // Controls metadata
        formTemplateUri = dataset + '{?subject,predicate,object}',
        formTemplate = UriTemplate.parse(formTemplateUri);

    // Add dataset metadata
    addTriple(dataset, rdf + 'type', voID  + 'Dataset');
    addTriple(dataset, rdf + 'type', hydra + 'Collection');
    addTriple(dataset, voID + 'subset', fragment);
    addTriple(dataset, voID + 'uriLookupEndpoint', '"' + formTemplateUri + '"');

    // Add dataset affordances
    addTriple(dataset, hydra + 'search', '_:triplePattern');
    addTriple('_:triplePattern', hydra + 'template', '"' + formTemplateUri + '"');
    addTriple('_:triplePattern', hydra + 'mappings', '_:subject');
    addTriple('_:triplePattern', hydra + 'mappings', '_:predicate');
    addTriple('_:triplePattern', hydra + 'mappings', '_:object');
    addTriple('_:subject',   hydra + 'variable',      '"subject"');
    addTriple('_:subject',   hydra + 'property', rdf + 'subject');
    addTriple('_:predicate', hydra + 'variable',      '"predicate"');
    addTriple('_:predicate', hydra + 'property', rdf + 'predicate');
    addTriple('_:object',    hydra + 'variable',      '"object"');
    addTriple('_:object',    hydra + 'property', rdf + 'object');

    // Add fragment metadata
    addTriple(fragment, rdf + 'type', hydra + 'Collection');
    addTriple(fragment, rdf + 'type', hydra + 'PagedCollection');
    addTriple(fragment, dcterms + 'title', '"A \'' + datasetName + '\' Linked Data Fragment"@en');
    addTriple(fragment, dcterms + 'description',
              '"Basic Linked Data Fragment of the \'' + datasetName + '\' dataset ' +
              'containing triples matching the pattern ' + patternString + '."@en');
    addTriple(fragment, hydra + 'entrypoint', dataset);
    addTriple(fragment, dcterms + 'source',   dataset);
    addTriple(fragment, hydra + 'totalItems', '"' + count + '"^^<' + xsd + 'integer>');
    addTriple(fragment, voID  + 'triples',    '"' + count + '"^^<' + xsd + 'integer>');

    // Add subject metadata
    if (subject) {
      addTriple(fragment, dcterms + 'subject', subject);
      if (predicate || object)
        addTriple(subject, rdfs + 'seeAlso', formTemplate.expand({ subject: subjectURI }));
      addTriple(subject, rdfs + 'seeAlso', formTemplate.expand({ object: subjectURI }));
    }

    // Add predicate metadata
    if (predicate) {
      if (!subject && !object) {
        addTriple(dataset, voID + 'propertyPartition', fragment);
        addTriple(fragment, voID + 'property', predicate);
      }
      if (subject || object)
        addTriple(predicate, rdfs + 'seeAlso', formTemplate.expand({ predicate: predicateURI }));
      addTriple(predicate, rdfs + 'seeAlso', formTemplate.expand({ subject: predicateURI }));
      addTriple(predicate, rdfs + 'seeAlso', formTemplate.expand({ object: predicateURI }));
    }

    // Add object metadata
    if (object) {
      addTriple(fragment, dcterms + 'subject', object);
      if (!subject && predicate === rdf + 'type') {
        addTriple(dataset, voID + 'classPartition', fragment);
        addTriple(fragment, voID + 'class', object);
      }
      if (!objectIsLiteral) {
        if (subject || predicate)
          addTriple(object, rdfs + 'seeAlso', formTemplate.expand({ object: objectURI }));
        addTriple(object, rdfs + 'seeAlso', formTemplate.expand({ subject: objectURI }));
      }
    }
  },

  // Ends the writer
  end: function () {
    this._writer.end();
  },

  // Creates an N3Writer object that writes to the output stream
  _createWriter: function (outputStream) {
    return new N3.Writer(outputStream, this._prefixes);
  },
};

module.exports = TurtleFragmentWriter;
