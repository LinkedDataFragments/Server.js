# Linked Data Fragments Server - SPARQL Datasource
<img src="http://linkeddatafragments.org/images/logo.svg" width="200" align="right" alt="" />

[![npm version](https://badge.fury.io/js/%40ldf%2Fdatasource-sparql.svg)](https://www.npmjs.com/package/@ldf/datasource-sparql)

This module contains a SPARQL datasource for the [Linked Data Fragments server](https://github.com/LinkedDataFragments/Server.js).
It allows SPARQL endpoints to be used as a data proxy.

_This package is a [Linked Data Fragments Server module](https://github.com/LinkedDataFragments/Server.js/)._

## Usage in `@ldf/server`

This package exposes the following config entries:
* `SparqlDatasource`: A SPARQL-endpoint-based datasource that requires at least one `sparqlEndpoint` field. _Should be used as `@type` value._
* `sparqlEndpoint`: Refers to an absolute or relative file location of an HDT file. _Should be used as key in a `SparqlDatasource`._

Example:
```json
{
  "@context": "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/server/^3.0.0/components/context.jsonld",
  "@id": "urn:ldf-server:my",
  "import": "preset-qpf:config-defaults.json",

  "datasources": [
    {
      "@id": "ex:mySparqlDatasource",
      "@type": "SparqlDatasource",
      "datasourceTitle": "My SPARQL source",
      "description": "My datasource with a SPARQL-endpoint back-end",
      "datasourcePath": "mysparql",
      "sparqlEndpoint": "https://dbpedia.org/sparql"
    }
  ]
}
```

## Usage in other packages

When this module is used in a package other than `@ldf/server`,
then the JSON-LD context `https://linkedsoftwaredependencies.org/contexts/@ldf/datasource-sparql.jsonld` must be imported.

For example:
```
{
  "@context": [
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/core/^3.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/preset-qpf/^3.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/datasource-sparql/^3.0.0/components/context.jsonld",
  ],
  // Same as above...
}
```

## License
The Linked Data Fragments server is written by [Ruben Verborgh](https://ruben.verborgh.org/), Miel Vander Sande, [Ruben Taelman](https://www.rubensworks.net/) and colleagues.

This code is copyrighted by [Ghent University – imec](http://idlab.ugent.be/)
and released under the [MIT license](http://opensource.org/licenses/MIT).
