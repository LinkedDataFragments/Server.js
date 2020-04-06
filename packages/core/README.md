# Linked Data Fragments Server - Core
<img src="http://linkeddatafragments.org/images/logo.svg" width="200" align="right" alt="" />

[![npm version](https://badge.fury.io/js/%40ldf%2Fcore.svg)](https://www.npmjs.com/package/@ldf/core)

This package provides core classes with shared functionality for Linked Data Fragments servers.

This package should be used if you want to create your own LDF server configuration or LDF server module.
If you just want to run a QPF server, you can make use of [`@ldf/server`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/server) instead.

_This package is a [Linked Data Fragments Server module](https://github.com/LinkedDataFragments/Server.js/)._

## Usage in `@ldf/server`

This package exposes the the following context entries:

**Controllers:**
* `AssetsController`: Responds to requests for assets. This is enabled by default in `@ldf/server`. _Should be used as `@type` controller value._
* `DereferenceController`: Responds to dereferencing requests. This is enabled by default in `@ldf/server`. _Should be used as `@type` controller value._
* `NotFoundController`: Responds to requests that cannot be resolved. This is enabled by default in `@ldf/server`. _Should be used as `@type` controller value._
* `Controller`: An abstract controller. _Should be used as `extends` value when creating new controllers._
* `ControllerExtension`: An abstract controller extension. _Should be used as `extends` value when creating new controller extensions._
* `assetsDir`: Path to a directory where assets can be found. _Should be used as key in a `Server` config._
* `assetsPath`: URL matching for assets. _Should be used as key in a `Server` config._
* `dereference`: A dereferencing entry for a datasource to a path. _Should be used as key in a `Server` config._
* `dereferenceDatasource`: The datasource of a dereferencing entry. _Should be used as key in a dereferencing entry._
* `dereferencePath`: The path of a dereferencing entry. _Should be used as key in a dereferencing entry._

**Datasources:**
* `EmptyDatasource`: An empty data source doesn't contain any quads. _Should be used as `@type` datasource value._
* `IndexDatasource`: A datasource that lists other data sources. This is enabled by default in `@ldf/server`. _Should be used as `@type` datasource value._
* `MemoryDatasource`: An abstract in-memory datasource. _Should be used as `extends` value when creating new in-memory datasources._
* `Datasource`: An abstract datasource. _Should be used as `extends` value when creating new datasources._
* `datasourceTitle`: The title of a datasource. _Should be used as key in a datasource._
* `description`: The description of a datasource. _Should be used as key in a datasource._
* `datasourcePath`: The relative path to the datasource from the baseURL. _Should be used as key in a datasource._
* `enabled`: If the datasource is enabled, by default true. _Should be used as key in a datasource._
* `hide`: If the datasource must be hide from the index, by default false. _Should be used as key in a datasource._
* `graph`: The default graph of the datasource. _Should be used as key in a datasource._
* `license`: The license of the datasource. _Should be used as key in a datasource._
* `licenseUrl`: A link to the license of the datasource. _Should be used as key in a datasource._
* `copyright`: The copyright statement of the datasource. _Should be used as key in a datasource._
* `homepage`: The homepage url of the datasource. _Should be used as key in a datasource._
* `quads`: If quad patterns are supported, otherwise only triple patterns are supported. Defaults to `true`. _Should be used as key in a datasource._
* `file`: The dataset file path. _Should be used as key in a memory datasource._
* `datasourceUrl`: The dataset file URL from the baseURL. _Should be used as key in a memory datasource._

**Routers:**
* `DatasourceRouter`: Routes URLs to data sources. This is enabled by default in `@ldf/server`. _Should be used as `@type` router value._
* `PageRouter`: Routes page numbers to offsets. This is enabled by default in `@ldf/server`. _Should be used as `@type` router value._
* `Router`: An abstract router. _Should be used as `extends` value when creating new routers._
* `pageSize`: The triple page size, which defaults to 100. _Should be used as key in a page router._

**Views:**
* `ErrorHtmlView`: Represents a 500 response in HTML. This is enabled by default in `@ldf/server`. _Should be used as `@type` view value._
* `ForbiddenHtmlView`: Represents a 401 response in HTML. This is enabled by default in `@ldf/server`. _Should be used as `@type` view value._
* `NotFoundHtmlView`: Represents a 404 response in HTML. This is enabled by default in `@ldf/server`. _Should be used as `@type` view value._
* `ErrorRdfView`: Represents a 500 response in RDF. This is enabled by default in `@ldf/server`. _Should be used as `@type` view value._
* `NotFoundRdfView`: Represents a 404 response in RDF. This is enabled by default in `@ldf/server`. _Should be used as `@type` view value._
* `ViewCollection`: Provides access to content-negotiated views by name. This is enabled by default in `@ldf/server`. _Should be used as `@type` view value._
* `HtmlView`: An abstract HTML view. _Should be used as `extends` value when creating new HTML views._
* `RdfView`: An abstract RDF view. _Should be used as `extends` value when creating new RDF views._
* `View`: An abstract view. _Should be used as `extends` value when creating new views._
* `viewExtensions`: A view extension. _Should be used as key in a view._
* `viewCache`: If views should be cached. _Should be used as key in an HTML view._
* `viewHeader`: The view header title. _Should be used as key in an HTML view._

**Other:**
* `Server`: An HTTP server that provides access to Linked Data Fragments. This is enabled by default in `@ldf/server`. _Should be used as `@type` value._
* `title`: The server name. _Should be used as key in a `Server` config._
* `baseURL`: The base URL path for the server. _Should be used as key in a `Server` config._
* `port`: The port the server will bind with. _Should be used as key in a `Server` config._
* `workers`: The number of server instances that will be started. _Should be used as key in a `Server` config._
* `protocol`: Explicitly set the protocol, default will be the protocol derived from the baseURL. _Should be used as key in a `Server` config._
* `datasource` or `datasources`: One or more datasources for the server. _Should be used as key in a `Server` config._
* `prefixes`: A collection of default URI prefixes. _Should be used as key in a `Server` config._
* `prefix`: The prefix label of a prefix entry. _Should be used as key in a prefix entry._
* `uri`: The prefix URI of a prefix entry. _Should be used as key in a prefix entry._
* `responseHeaders`: Default headers that should be set in responses. _Should be used as key in a prefix entry._
* `headerName`: The header name in a response header entry. _Should be used as key in a response header entry._
* `headerValue`: The header value in a response header entry. _Should be used as key in a response header entry._
* `sslKey`: Path to an SSL key. _Should be used as key in a `Server` config._
* `sslCert`: Path to an SSL certificate. _Should be used as key in a `Server` config._
* `sslCa`: Path to an SSL certificate authority. _Should be used as key in a `Server` config._
* `logging`: If the server should perform logging, defaults to `false`. _Should be used as key in a `Server` config._
* `loggingFile`: Path to a log file. _Should be used as key in a `Server` config._
* `routers`: Routers for the server. This is configured by default in `@ldf/server`. _Should be used as key in a `Server` config._
* `controllers`: Controllers for the server. This is configured by default in `@ldf/server`. _Should be used as key in a `Server` config._
* `viewCollection`: Override the default view collection. This is configured by default in `@ldf/server`. _Should be used as key in a `Server` config._
* `views`: Views for the server. This is configured by default in `@ldf/server`. _Should be used as key in a `Server` config._
* `UrlData`: A data object class for preset URL information. This is enabled by default in `@ldf/server`. _Should be used as `@type` value._
* `urlData`: The UrlData helper object. This is enabled by default in `@ldf/server`. _Should be used as key in a `Server` config._
* `dataFactory`: A [factory object to construct RDFJS terms](http://rdf.js.org/data-model-spec/#datafactory-interface). `@ldf/server` uses the [N3](https://github.com/rdfjs/N3.js) `DataFactory` by default. _Should be used as key in a `Server` config._

`@ldf/server` and `@ldf/preset-qpf` provide default instantiations of all core classes,
which means that you don't have to define them in your config file yourself.
The only thing you still need to do is defining different optional parameters, as shown below.

Example:
```json
{
  "@context": "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/server/^3.0.0/components/context.jsonld",
  "@id": "urn:ldf-server:my",
  "import": "preset-qpf:config-defaults.json",

  "title": "My Linked Data Fragments server",
  "baseURL": "https://example.org/",
  "port": 3000,
  "workers": 2,
  "protocol": "http",

  "datasources": [
    {
      "@id": "ex:myDatasourceVersion1",
      "@type": "SparqlDatasource",
      "datasourceTitle": "My SPARQL source",
      "description": "My datasource with a SPARQL-endpoint back-end",
      "datasourcePath": "mysparql",
      "sparqlEndpoint": "https://dbpedia.org/sparql",
      "enabled": true,
      "hide": false,
      "license": "MIT",
      "licenseUrl": "http://example.org/my-license",
      "copyright": "This datasource is owned by Alice",
      "homepage": "http://example.org/alice"
    },
    {
      "@id": "ex:myDatasourceVersion2",
      "@type": "TurtleDatasource",
      "datasourceTitle": "My Turtle file",
      "description": "My dataset with a Turtle back-end",
      "datasourcePath": "myttl",
      "file": "path/to/file.ttl",
      "graph": "http://example.org/default-graph"
    }
  ],

  "prefixes": [
    { "prefix": "rdf",         "uri": "http://www.w3.org/1999/02/22-rdf-syntax-ns#" },
    { "prefix": "rdfs",        "uri": "http://www.w3.org/2000/01/rdf-schema#" },
    { "prefix": "owl",         "uri": "http://www.w3.org/2002/07/owl#" },
    { "prefix": "xsd",         "uri": "http://www.w3.org/2001/XMLSchema#" },
    { "prefix": "hydra",       "uri": "http://www.w3.org/ns/hydra/core#" },
    { "prefix": "void",        "uri": "http://rdfs.org/ns/void#" },
    { "prefix": "skos",        "uri": "http://www.w3.org/2004/02/skos/core#" },
    { "prefix": "dcterms",     "uri": "http://purl.org/dc/terms/" },
    { "prefix": "dc11",        "uri": "http://purl.org/dc/elements/1.1/" },
    { "prefix": "foaf",        "uri": "http://xmlns.com/foaf/0.1/" },
    { "prefix": "geo",         "uri": "http://www.w3.org/2003/01/geo/wgs84_pos#" },
    { "prefix": "dbpedia",     "uri": "http://dbpedia.org/resource/" },
    { "prefix": "dbpedia-owl", "uri": "http://dbpedia.org/ontology/" },
    { "prefix": "dbpprop",     "uri": "http://dbpedia.org/property/" }
  ],

  "logging": true,
  "loggingFile": "access.log",

  "dereference": [
    {
      "dereferenceDatasource": "ex:myDatasourceVersion2",
      "dereferencePath": "/resource/"
    }
  ],

  "responseHeaders": [
    { "headerName": "Access-Control-Allow-Origin",   "headerValue": "*" },
    { "headerName": "Access-Control-Allow-Headers",  "headerValue": "Accept-Datetime" },
    { "headerName": "Access-Control-Expose-Headers", "headerValue": "Content-Location,Link,Memento-Datetime" }
  ],

  "sslKey": "../core/config/certs/localhost-server.key",
  "sslCert": "../core/config/certs/localhost-server.crt",
  "sslCa": "../core/config/certs/localhost-ca.crt",

  "router": [
    {
      "@id": "preset-qpf:sets/routers.json#myPageRouter",
      "pageSize": 50
    }
  ]
}

```

## Usage in other packages

When this module is used in a package other than `@ldf/server`,
then the JSON-LD context `https://linkedsoftwaredependencies.org/contexts/@ldf/core.jsonld` must be imported.

For example:
```
{
  "@context": [
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/core/^3.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/preset-qpf/^3.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/core/^3.0.0/components/context.jsonld"
  ],
  "@id": "urn:ldf-server:my",

  "controllers": [
    {
      "@id": "ex:myAssetsController",
      "@type": "AssetsController"
    },
    {
      "@id": "ex:myDereferenceController",
      "@type": "DereferenceController"
    },
    {
      "@id": "ex:myNotFoundController",
      "@type": "NotFoundController"
    }
  ],

  "datasources": [
    {
      "@id": "ex:myIndexDatasource",
      "@type": "IndexDatasource",
      "datasourceTitle": "dataset index",
      "datasourcePath": "/",
      "hide": true
    }
  ],

  "prefixes": [
    { "prefix": "rdf",         "uri": "http://www.w3.org/1999/02/22-rdf-syntax-ns#" },
    { "prefix": "rdfs",        "uri": "http://www.w3.org/2000/01/rdf-schema#" },
    { "prefix": "owl",         "uri": "http://www.w3.org/2002/07/owl#" },
    { "prefix": "xsd",         "uri": "http://www.w3.org/2001/XMLSchema#" },
    { "prefix": "hydra",       "uri": "http://www.w3.org/ns/hydra/core#" },
    { "prefix": "void",        "uri": "http://rdfs.org/ns/void#" }
  ],

  "routers": [
    {
      "@id": "ex:myDatasourceRouter",
      "@type": "DatasourceRouter"
    },
    {
      "@id": "ex:myPageRouter",
      "@type": "PageRouter"
    }
  ],

  "views": [
    {
      "@id": "ex:myErrorHtmlView",
      "@type": "ErrorHtmlView"
    },
    {
      "@id": "ex:myErrorRdfView",
      "@type": "ErrorRdfView"
    },
    {
      "@id": "ex:myForbiddenHtmlView",
      "@type": "ForbiddenHtmlView"
    },
    {
      "@id": "ex:myNotFoundHtmlView",
      "@type": "NotFoundHtmlView"
    },
    {
      "@id": "ex:myNotFoundRdfView",
      "@type": "NotFoundRdfView"
    }
  ]

  // Same as above...
}
```

## License
The Linked Data Fragments server is written by [Ruben Verborgh](https://ruben.verborgh.org/), Miel Vander Sande, [Ruben Taelman](https://www.rubensworks.net/) and colleagues.

This code is copyrighted by [Ghent University – imec](http://idlab.ugent.be/)
and released under the [MIT license](http://opensource.org/licenses/MIT).
