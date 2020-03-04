# Linked Data Fragments Server - Composite Datasource
<img src="http://linkeddatafragments.org/images/logo.svg" width="200" align="right" alt="" />

[![npm version](https://badge.fury.io/js/%40ldf%2Fdatasource-composite.svg)](https://www.npmjs.com/package/@ldf/datasource-composite)

This module contains a composite datasource for the [Linked Data Fragments server](https://github.com/LinkedDataFragments/Server.js).
It delegates queries to an sequence of other datasources.

_This package is a [Linked Data Fragments Server module](https://github.com/LinkedDataFragments/Server.js/)._

## Usage in `@ldf/server`

This package exposes the following config entries:
* `CompositeDatasource`: A composite datasource that requires at least one `compose` field. _Should be used as `@type` value._
* `compose`: Refers to an array of datasource id's that should be composed. _Should be used as key in a `CompositeDatasource`._

Example:
```json
{
  "@context": "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/server/^3.0.0/components/context.jsonld",
  "@id": "urn:ldf-server:my",
  "import": "preset-qpf:config-defaults.json",

  "datasources": [
    {
      "@id": "ex:myCompositeDatasource",
      "@type": "CompositeDatasource",
      "datasourceTitle": "Composite",
      "description": "An example composite datasource",
      "datasourcePath": "composite",
      "compose": [ "ex:myHdtDatasource", "ex:mySparqlDatasource" ]
    },
    {
      "@id": "ex:myHdtDatasource",
      "@type": "HdtDatasource",
      "datasourceTitle": "DBpedia 2014",
      "description": "DBpedia 2014 with an HDT back-end",
      "datasourcePath": "dbpedia",
      "hdtFile": "data/dbpedia2014.hdt"
    },
    {
      "@id": "ex:mySparqlDatasource",
      "@type": "SparqlDatasource",
      "datasourceTitle": "DBpedia (Virtuoso)",
      "description": "DBpedia with a Virtuoso back-end",
      "datasourcePath": "dbpedia-sparql",
      "sparqlEndpoint": "https://dbpedia.org/sparql"
    }
  ]
}
```

## Usage in other packages

When this module is used in a package other than `@ldf/server`,
then the JSON-LD context `https://linkedsoftwaredependencies.org/contexts/@ldf/datasource-composite.jsonld` must be imported.

For example:
```
{
  "@context": [
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/core/^3.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/preset-qpf/^3.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/datasource-hdt/^3.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/datasource-sparql/^3.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/datasource-composite/^3.0.0/components/context.jsonld",
  ],
  // Same as above...
}
```

## License
The Linked Data Fragments server is written by [Ruben Verborgh](https://ruben.verborgh.org/), Miel Vander Sande, [Ruben Taelman](https://www.rubensworks.net/) and colleagues.

This code is copyrighted by [Ghent University – imec](http://idlab.ugent.be/)
and released under the [MIT license](http://opensource.org/licenses/MIT).
