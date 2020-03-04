# Linked Data Fragments Server - Memento
<img src="http://linkeddatafragments.org/images/logo.svg" width="200" align="right" alt="" />

[![npm version](https://badge.fury.io/js/%40ldf%2Ffeature-memento.svg)](https://www.npmjs.com/package/@ldf/feature-memento)

This module adds support for the [Memento Protocol](http://mementoweb.org/about/) to the [Linked Data Fragments server](https://github.com/LinkedDataFragments/Server.js).
If your Linked Data source evolve over time and has multiple versions, it makes access and query across the various versions straightforward.
To enable the [Memento Protocol](http://mementoweb.org/about/), follow the guide below.

_This package is a [Linked Data Fragments Server module](https://github.com/LinkedDataFragments/Server.js/)._

## Memento basics

Any data source can be configured as a Memento resource, meaning it represents a prior version of an existing data source.
This is done by adding a `mementos` entry to your config file that introduces a new memento time gate path, identified by `timegatePath`.
This time gate can contain several version, each pointing to a certain datasource using the `mementoDatasource` key.
The version time range is identified using the `versionStart` and `versionEnd` timestamps.
Each timestamp must be in [ISO 8601 format](https://en.wikipedia.org/wiki/ISO_8601).

For example, the datasources `ex:myDbpedia2015` and `ex:myDbpedia2014` are mementos of DBpedia valid in 2014 and 2015:

```json
{
  "mementos": [
    {
      "timegatePath": "dbpedia",
      "versions": [
        {
          "mementoDatasource": "ex:myDbpedia2015",
          "start": "2014-09-14T11:59:59Z",
          "end": "2015-04-15T00:00:00Z",
          "originalBaseURL": "http://fragments.mementodepot.org/dbpedia_201510"
        },
        {
          "mementoDatasource": "ex:myDbpedia2014",
          "start": "2013-06-15T11:59:59Z",
          "end": "2014-09-15T00:00:00Z"
        }
      ]
    }
  ]
}
```

In case a version is hosted externally, you can specify the version's `originalBaseURL` to reconstruct its URL.

### Example: DBpedia TPF archive
The [Memento DBpedia LDF Server](http://fragments.mementodepot.org/) supports about 10 versions of DBpedia starting from 2007.
A Memento Client like [Memento for Chrome](http://bit.ly/memento-for-chrome) can be used to navigate the versions in a browser.
The command line utility, cUrl, can also be used to see Memento in action.
The following example queries the Memento LDF TimeGate to retrieve a Memento of the English DBpedia page around 15 March 2015.

```Bash
$ curl -IL -H "Accept-Datetime: Wed, 15 Apr 2015 00:00:00 GMT" http://dbpedia.mementodepot.org/timegate/http://dbpedia.org/page/English

HTTP/1.1 302 Found
Date: Tue, 15 Mar 2016 21:07:08 GMT
Location: http://dbpedia.mementodepot.org/memento/20150415000000/http://dbpedia.org/page/English
Vary: accept-datetime
Link: <http://dbpedia.org/page/English>; rel="original",<http://dbpedia.mementodepot.org/timemap/link/http://dbpedia.org/page/English>; rel="timemap"; type="application/link-format",<http://dbpedia.mementodepot.org/memento/20150415000000/http://dbpedia.org/page/English>; rel="memento"; datetime="Wed, 15 Apr 2015 00:00:00 GMT"

HTTP/1.1 200 OK
Date: Tue, 15 Mar 2016 21:07:08 GMT
Content-Type: text/html
Link: <http://dbpedia.org/page/English>; rel="original", <http://dbpedia.mementodepot.org/memento/20150415000000/http://dbpedia.org/page/English>; rel="memento"; datetime="Wed, 15 Apr 2015 00:00:00 GMT", <http://dbpedia.mementodepot.org/timegate/http://dbpedia.org/page/English>; rel="timegate", <http://dbpedia.mementodepot.org/timemap/link/http://dbpedia.org/page/English>; rel="timemap"
Memento-Datetime: Wed, 15 Apr 2015 00:00:00 GMT
```

## Usage in `@ldf/server`

This package exposes the following config entries:
* `TimegateController`: A TimegateController responds to time gate requests. This is enabled by default in `@ldf/server`. _Should be used as `@type` value._
* `MementoControllerExtension`: A MementoControllerExtension extends Quad Pattern Fragments responses with Memento headers. This is enabled by default in `@ldf/server`. _Should be used as `@type` value._
* `MementoQpfHtmlView`: A MementoHtmlViewExtension extends the Quad Pattern Fragments HTML view with Memento details. This is enabled by default in `@ldf/server`. _Should be used as `@type` value._
* `timegateBaseUrl`: The base URL for all Memento time gates. _Should be used as key in a `Server` config._
* `mementos`: One or more Memento configurations. _Should be used as key in a `Server` config._
* `timegatePath`: URL path for a Memento within a time gate. _Should be used as key in memento value._
* `versions`: Version entries for a given Memento. _Should be used as key in memento value._
* `mementoDatasource`: The datasource corresponding to a given version. _Should be used as key in memento version value._
* `versionStart`: The start datetime of a given version. _Should be used as key in memento version value._
* `versionEnd`: The end datetime of a given version. _Should be used as key in memento version value._
* `mementoBaseURL`: An optional external memento base URL to override. _Should be used as key in memento version value._

`@ldf/server` and `@ldf/preset-qpf` provide default instantiations of `TimegateController`, `MementoControllerExtension` and `MementoQpfHtmlView`,
which means that you don't have to define them in your config file yourself.
The only thing you still need to do is defining the time gate and its mementos, as shown in the example below.

Example:
```json
{
  "@context": "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/server/^3.0.0/components/context.jsonld",
  "@id": "urn:ldf-server:my",
  "import": "preset-qpf:config-defaults.json",

  "datasources": [
    {
      "@id": "ex:myDatasourceVersion1",
      "@type": "SparqlDatasource",
      "datasourceTitle": "My SPARQL source",
      "description": "My datasource with a SPARQL-endpoint back-end",
      "datasourcePath": "mysparql",
      "sparqlEndpoint": "https://dbpedia.org/sparql"
    },
    {
      "@id": "ex:myDatasourceVersion2",
      "@type": "TurtleDatasource",
      "datasourceTitle": "My Turtle file",
      "description": "My dataset with a Turtle back-end",
      "datasourcePath": "myttl",
      "file": "path/to/file.ttl"
    }
  ],

  "timegateBaseUrl": "/timegate/",
  "mementos": [
    {
      "timegatePath": "mydatasource",
      "versions": [
        {
          "mementoDatasource": "ex:myDatasourceVersion1",
          "versionStart": "2014-09-14T11:59:59Z",
          "versionEnd": "2015-04-15T00:00:00Z"
        },
        {
          "mementoDatasource": "ex:myDatasourceVersion2",
          "versionStart": "2015-06-15T11:59:59Z",
          "versionEnd": "2016-09-15T00:00:00Z",
          "mementoBaseURL": "http://fragments.mementodepot.org/dbpedia_201510"
        }
      ]
    }
  ]
}

```

## Usage in other packages

When this module is used in a package other than `@ldf/server`,
then the JSON-LD context `https://linkedsoftwaredependencies.org/contexts/@ldf/feature-memento.jsonld` must be imported.

For example:
```
{
  "@context": [
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/core/^3.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/preset-qpf/^3.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/feature-qpf/^3.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/feature-memento/^3.0.0/components/context.jsonld",
  ],
  "@id": "urn:ldf-server:my",

  "controllers": [
    {
      "@id": "ex:myTimegateController",
      "@type": "TimegateController"
    },
    {
      "@id": "ex:myQuadPatternFragmentsController", // This should refer to your existing QuadPatternFragmentsController
      "@type": "QuadPatternFragmentsController",
      "qpfControllerExtension": {
        "@id": "ex:myMementoControllerExtension",
        "@type": "MementoControllerExtension"
      }
    }
  ],

  "views": [
    {
      "@id": "ex:myQpfHtmlView", // This should refer to your existing QpfHtmlView
      "@type": "QpfHtmlView",
      "viewExtension": {
        "@id": "ex:myMementoQpfHtmlView",
        "@type": "MementoQpfHtmlView"
      }
    }
  ]

  // Same as above...
}
```

## License
The Linked Data Fragments server is written by [Ruben Verborgh](https://ruben.verborgh.org/), Miel Vander Sande, [Ruben Taelman](https://www.rubensworks.net/) and colleagues.

This code is copyrighted by [Ghent University – imec](http://idlab.ugent.be/)
and released under the [MIT license](http://opensource.org/licenses/MIT).
