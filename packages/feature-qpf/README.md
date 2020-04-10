# Linked Data Fragments Server - Quad Pattern Fragments
<img src="http://linkeddatafragments.org/images/logo.svg" width="200" align="right" alt="" />

[![npm version](https://badge.fury.io/js/%40ldf%2Ffeature-qpf.svg)](https://www.npmjs.com/package/@ldf/feature-qpf)

This module adds [Quad Pattern Fragments](https://linkeddatafragments.org/specification/quad-pattern-fragments/)
(a.k.a. [Triple Pattern Fragments](https://linkeddatafragments.org/specification/triple-pattern-fragments/))
support to the [Linked Data Fragments server](https://github.com/LinkedDataFragments/Server.js).

_This package is a [Linked Data Fragments Server module](https://github.com/LinkedDataFragments/Server.js/)._

## Usage in `@ldf/server`

This package exposes the following config entries:
* `QuadPatternFragmentsController`: A QuadPatternFragmentsController responds to requests for TPFs and QPFs. _Should be used as controller `@type` value._
* `QuadPatternRouter`: A QuadPatternRouter routes basic quad patterns. _Should be used as router `@type` value._
* `QpfHtmlView`: A QuadPatternFragmentsRdfView represents a TPF or QPF in HTML. _Should be used as view `@type` value._
* `QpfRdfView`: A QuadPatternFragmentsRdfView represents a TPF or QPF in RDF. _Should be used as view `@type` value._
* `qpfControllerExtension` or `qpfControllerExtensions`: One or more optional controller extensions for a QPF controller. See [`MementoControllerExtension`](https://github.com/LinkedDataFragments/Server.js/tree/release/3/packages/feature-memento#usage-in-ldfserver) as an example. _Should be used as a field on a `QuadPatternFragmentsController`._

`@ldf/server` and `@ldf/preset-qpf` provide default instantiations of `QuadPatternFragmentsController`, `QuadPatternRouter`, `QpfHtmlView` and `QpfRdfView`,
which means that no configuration is required here.

## Usage in other packages

When this module is used in a package other than `@ldf/server`,
then the JSON-LD context `https://linkedsoftwaredependencies.org/contexts/@ldf/datasource-sparql.jsonld` must be imported.

For example:
```
{
  "@context": [
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/core/^3.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/preset-qpf/^3.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/feature-qpf/^3.0.0/components/context.jsonld"
  ],
  "@id": "urn:ldf-server:my",

  "controllers": [
    {
      "@id": "ex:myQuadPatternFragmentsController",
      "@type": "QuadPatternFragmentsController"
    }
  ],

  "routers": [
    {
      "@id": "ex:myQuadPatternRouter",
      "@type": "QuadPatternRouter"
    }
  ],

  "views": [
    {
      "@id": "ex:myQpfHtmlView",
      "@type": "QpfHtmlView"
    },
    {
      "@id": "ex:myQpfRdfView",
      "@type": "QpfRdfView"
    }
  ]
}
```

## License
The Linked Data Fragments server is written by [Ruben Verborgh](https://ruben.verborgh.org/), Miel Vander Sande, [Ruben Taelman](https://www.rubensworks.net/) and colleagues.

This code is copyrighted by [Ghent University – imec](http://idlab.ugent.be/)
and released under the [MIT license](http://opensource.org/licenses/MIT).
