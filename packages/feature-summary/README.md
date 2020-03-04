# Linked Data Fragments Server - Summary
<img src="http://linkeddatafragments.org/images/logo.svg" width="200" align="right" alt="" />

[![npm version](https://badge.fury.io/js/%40ldf%2Ffeature-summary.svg)](https://www.npmjs.com/package/@ldf/feature-summary)

This module adds summaries to datasources based on turtle files corresponding to the datasource name.

_This package is a [Linked Data Fragments Server module](https://github.com/LinkedDataFragments/Server.js/)._

## Usage in `@ldf/server`

This package exposes the following config entries:
* `SummaryController`: Responds to requests for summaries. This is enabled by default in `@ldf/server`. _Should be used as `@type` value._
* `SummaryQpfHtmlView`: Extends the Quad Pattern Fragments HTML view with a summary link. This is enabled by default in `@ldf/server`. _Should be used as `@type` value._
* `SummaryQpfRdfView`: Extends the Quad Pattern Fragments RDF view with a summary link. This is enabled by default in `@ldf/server`. _Should be used as `@type` value._
* `SummaryRdfView`: Represents a data summary in RDF. This is enabled by default in `@ldf/server`. _Should be used as `@type` value._
* `summaryDir`: Path to a directory where summaries can be found. _Should be used as key in a `Server` config or `SummaryController`._
* `summaryPath`: URL path for summaries. _Should be used as key in a `Server` config or `SummaryController`._

`@ldf/server` and `@ldf/preset-qpf` provide default instantiations of `SummaryController`, `SummaryQpfHtmlView`, `SummaryQpfRdfView` and `SummaryRdfView`,
which means that you don't have to define them in your config file yourself.
The only thing you still need to do is defining the summary directory and the URL on which they should be exposed, as shown in the example below.

Example:
```json
{
  "@context": "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/server/^3.0.0/components/context.jsonld",
  "@id": "urn:ldf-server:my",
  "import": "preset-qpf:config-defaults.json",

  "summaryDir": "../../summaries",
  "summaryPath": "/summaries/"
}

```

## Usage in other packages

When this module is used in a package other than `@ldf/server`,
then the JSON-LD context `https://linkedsoftwaredependencies.org/contexts/@ldf/feature-summary.jsonld` must be imported.

For example:
```
{
  "@context": [
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/core/^3.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/preset-qpf/^3.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/feature-qpf/^3.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/feature-summary/^3.0.0/components/context.jsonld",
  ],
  "@id": "urn:ldf-server:my",

  "controllers": [
    {
      "@id": "ex:mySummaryController",
      "@type": "SummaryController"
    }
  ],

  "views": [
    {
      "@id": "ex:myQpfHtmlView", // This should refer to your existing QpfHtmlView
      "viewExtension": {
        "@id": "ex:mySummaryQpfHtmlView",
        "@type": "SummaryQpfHtmlView"
      }
    },
    {
      "@id": "ex:myQpfRdfView", // This should refer to your existing QpfRdfView
      "viewExtension": {
        "@id": "ex:mySummaryQpfRdfView",
        "@type": "SummaryQpfRdfView"
      }
    },
    {
      "@id": "ex:mySummaryRdfView",
      "@type": "SummaryRdfView"
    }
  ]

  // Same as above...
}
```

## License
The Linked Data Fragments server is written by [Ruben Verborgh](https://ruben.verborgh.org/), Miel Vander Sande, [Ruben Taelman](https://www.rubensworks.net/) and colleagues.

This code is copyrighted by [Ghent University – imec](http://idlab.ugent.be/)
and released under the [MIT license](http://opensource.org/licenses/MIT).
