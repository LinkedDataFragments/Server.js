# Linked Data Fragments Server - N3 Datasources
<img src="http://linkeddatafragments.org/images/logo.svg" width="200" align="right" alt="" />

[![npm version](https://badge.fury.io/js/%40ldf%2Fdatasource-n3.svg)](https://www.npmjs.com/package/@ldf/datasource-n3)

This module contains a N3 datasources for the [Linked Data Fragments server](https://github.com/LinkedDataFragments/Server.js).
It allows [N-Quads](https://www.w3.org/TR/n-quads/), [N-Triples](https://www.w3.org/TR/n-triples/), [Trig](https://www.w3.org/TR/trig/) and [Turtle](https://www.w3.org/TR/turtle/) files to be loaded.

_This package is a [Linked Data Fragments Server module](https://github.com/LinkedDataFragments/Server.js/)._

## Usage in `@ldf/server`

This package exposes the following config entries:
* `NQuadsDatasource`: An N-Quads datasource that requires at least one `file` field. _Should be used as `@type` value._
* `NTriplesDatasource`: An N-Triples datasource that requires at least one `file` field. _Should be used as `@type` value._
* `TrigDatasource`: A Trig datasource that requires at least one `file` field. _Should be used as `@type` value._
* `TurtleDatasource`: A Turtle datasource that requires at least one `file` field. _Should be used as `@type` value._
* `N3Datasource`: An N3 datasource that requires at least one `file` field. _Should be used as `@type` value._

Example:
```json
{
  "@context": "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/server/^3.0.0/components/context.jsonld",
  "@id": "urn:ldf-server:my",
  "import": "preset-qpf:config-defaults.json",

  "datasources": [
    {
      "@id": "ex:myTurtleDatasource",
      "@type": "TurtleDatasource",
      "datasourceTitle": "My Turtle file",
      "description": "My dataset with a Turtle back-end",
      "datasourcePath": "myttl",
      "file": "path/to/file.ttl"
    }
  ]
}
```

## Usage in other packages

When this module is used in a package other than `@ldf/server`,
then the JSON-LD context `https://linkedsoftwaredependencies.org/contexts/@ldf/datasource-n3.jsonld` must be imported.

For example:
```
{
  "@context": [
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/core/^3.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/preset-qpf/^3.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/datasource-n3/^3.0.0/components/context.jsonld",
  ],
  // Same as above...
}
```

## License
The Linked Data Fragments server is written by [Ruben Verborgh](https://ruben.verborgh.org/), Miel Vander Sande, [Ruben Taelman](https://www.rubensworks.net/) and colleagues.

This code is copyrighted by [Ghent University – imec](http://idlab.ugent.be/)
and released under the [MIT license](http://opensource.org/licenses/MIT).
