# Linked Data Fragments Server - Quad Pattern Fragments
<img src="http://linkeddatafragments.org/images/logo.svg" width="200" align="right" alt="" />

[![npm version](https://badge.fury.io/js/%40ldf%2Fserver.svg)](https://www.npmjs.com/package/@ldf/server)
[![Docker Pulls](https://img.shields.io/docker/pulls/linkeddatafragments/server.svg)](https://hub.docker.com/r/linkeddatafragments/server/)

A Linked Data Fragments server with [Quad Pattern Fragments](https://linkeddatafragments.org/specification/quad-pattern-fragments/)
(a.k.a. [Triple Pattern Fragments](https://linkeddatafragments.org/specification/triple-pattern-fragments/)) support.

_This package has been renamed from `ldf-server` to `@ldf/server`._
_Find more information about migrating from `ldf-server` 2.x.x [on our wiki](https://github.com/LinkedDataFragments/Server.js/wiki/Release-3.0.0)._

_This package is a [Linked Data Fragments Server module](https://github.com/LinkedDataFragments/Server.js/)._

## Motivation

On today's Web, Linked Data is published in different ways,
which include [data dumps](http://downloads.dbpedia.org/3.9/en/),
[subject pages](http://dbpedia.org/page/Linked_data),
and [results of SPARQL queries](http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query=CONSTRUCT+%7B+%3Fp+a+dbpedia-owl%3AArtist+%7D%0D%0AWHERE+%7B+%3Fp+a+dbpedia-owl%3AArtist+%7D&format=text%2Fturtle).
We call each such part a [**Linked Data Fragment**](http://linkeddatafragments.org/).

The issue with the current Linked Data Fragments
is that they are either so powerful that their servers suffer from low availability rates
([as is the case with SPARQL](http://sw.deri.org/~aidanh/docs/epmonitorISWC.pdf)),
or either don't allow efficient querying.

Instead, this server offers [Quad Pattern Fragments](https://linkeddatafragments.org/specification/quad-pattern-fragments/)
(a.k.a. [Triple Pattern Fragments](https://linkeddatafragments.org/specification/triple-pattern-fragments/)).
Each Quad Pattern Fragment offers:

- **data** that corresponds to a _quad/triple pattern_
  _([example](http://data.linkeddatafragments.org/dbpedia?subject=&predicate=rdf%3Atype&object=dbpedia-owl%3ARestaurant))_.
- **metadata** that consists of the (approximate) total triple count
  _([example](http://data.linkeddatafragments.org/dbpedia?subject=&predicate=rdf%3Atype&object=))_.
- **controls** that lead to all other fragments of the same dataset
  _([example](http://data.linkeddatafragments.org/dbpedia?subject=&predicate=&object=%22John%22%40en))_.

An example server is available at [data.linkeddatafragments.org](http://data.linkeddatafragments.org/).

## Install the server

This server requires [Node.js](http://nodejs.org/) 10.0 or higher
and is tested on OSX and Linux.
To install, execute:
```bash
$ [sudo] npm install -g @ldf/server
```

## Use the server

### Configure the data sources

First, create a configuration file `config.json` similar to `config/config-example.json`,
in which you detail your data sources.
For example, this configuration uses an [HDT file](http://www.rdfhdt.org/)
and a [SPARQL endpoint](http://www.w3.org/TR/sparql11-protocol/) as sources:
```json
{
  "@context": "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/server/^3.0.0/components/context.jsonld",
  "@id": "urn:ldf-server:my",
  "import": "preset-qpf:config-defaults.json",

  "title": "My Linked Data Fragments server",

  "datasources": [
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

The following sources are supported out of the box:
- HDT files ([`HdtDatasource`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/datasource-hdt) with `hdtFile` setting)
- N-Triples documents ([`NTriplesDatasource`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/datasource-n3) with `file` setting)
- Turtle documents ([`TurtleDatasource`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/datasource-n3) with `file` setting)
- N-Quads documents ([`NQuadsDatasource`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/datasource-n3) with `file` setting)
- TriG documents ([`TrigDatasource`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/datasource-n3) with `file` setting)
- JSON-LD documents ([`JsonLdDatasource`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/datasource-jsonld) with `file` setting)
- SPARQL endpoints ([`SparqlDatasource`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/datasource-sparql) with `sparqlEndpoint`)

Support for new sources is possible by creating a new module implementing the [`Datasource`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/core) interface.

### Start the server

After creating a configuration file, execute
```bash
$ ldf-server config.json 5000 4
```
Here, `5000` is the HTTP port on which the server will listen,
and `4` the number of worker processes.

Now visit `http://localhost:5000/` in your browser.

### Reload running server

You can reload the server without any downtime
in order to load a new configuration or version.
<br>
In order to do this, you need the process ID of the server master process.
<br>
One possibility to obtain this are the server logs:
```bash
$ bin/ldf-server config.json
Master 28106 running.
Worker 28107 running on http://localhost:3000/.
```

If you send the server a `SIGHUP` signal:
```bash
$ kill -s SIGHUP 28106
```
it will reload by replacing its workers.

Note that crashed or killed workers are always replaced automatically.

### _(Optional)_ Set up a reverse proxy

A typical Linked Data Fragments server will be exposed
on a public domain or subdomain along with other applications.
Therefore, you need to configure the server to run behind an HTTP reverse proxy.
<br>
To set this up, configure the server's public URL in your server's `config.json`:
```json
{
  "title": "My Linked Data Fragments server",
  "baseURL": "http://data.example.org/",
  "datasources": { … }
}
```
Then configure your reverse proxy to pass requests to your server.
Here's an example for [nginx](http://nginx.org/):
```nginx
server {
  server_name data.example.org;

  location / {
    proxy_pass http://127.0.0.1:3000$request_uri;
    proxy_set_header Host $http_host;
    proxy_pass_header Server;
  }
}
```
Change the value `3000` into the port on which your Linked Data Fragments server runs.

If you would like to proxy the data in a subfolder such as `http://example.org/my/data`,
modify the `baseURL` in your `config.json` to `"http://example.org/my/data"`
and change `location` from `/` to `/my/data` (excluding a trailing slash).

### _(Optional)_ Running under HTTPS

HTTPS can be enabled in two ways: natively by the server, or through a proxy (explained above).

With native HTTPS, the server will establish the SSL layer. Set the following values in your config file to enable this:

     {
       "protocol": "https",
       "ssl": {
         "keys" : {
           "key": "./private-key-server.key.pem",
           "ca": ["./root-ca.crt.pem"],
           "cert": "./server-certificate.crt.pem"
        }
      }
    }  
  
  If `protocol`is not specified, it will derive the protocol from the `baseURL`. Hence, HTTPS can also be enabled as such:

     {
       "baseURL": "https://data.example.org/",
       "ssl": {
         "keys" : {
           "key": "./private-key-server.key.pem",
           "ca": ["./root-ca.crt.pem"],
           "cert": "./server-certificate.crt.pem"
        }
      }
    }  

If you decide to let a proxy handle HTTPS, use this configuration to run the server as `http`, but construct links as `https` (so clients don't break):

     {
       "protocol": "http",
       "baseURL": "https://data.example.org/",
     }  


### _(Optional)_ Running in a Docker container

If you want to rapidly deploy the server as a microservice, you can build a [Docker](https://www.docker.com/) container as follows:

```bash
$ docker build -t ldf-server .
```
After that, you can run your newly created container:
```bash
$ docker run -p 3000:3000 -t -i --rm -v $(pwd)/config.json:/tmp/config.json ldf-server /tmp/config.json
```

### _(Optional)_ Host historical version of datasets

You can [enable the Memento protocol](https://github.com/LinkedDataFragments/Server.js/wiki/Configuring-Memento) to offer different versions of an evolving dataset.

## Relation to other modules

This package should be used if you want to use an LDF server with the QPF feature.
If you want to extend this server with additional modules,
you can make use of [`@ldf/preset-qpf`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/preset-qpf) instead.

Concretely, it configures the following packages:

* [`@ldf/core`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/core): Shared functionality for LDF servers.
* [`@ldf/feature-qpf`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/feature-qpf): Feature that enables [Quad Pattern Fragments](https://linkeddatafragments.org/specification/quad-pattern-fragments/) (a.k.a. [Triple Pattern Fragments](https://linkeddatafragments.org/specification/triple-pattern-fragments/)).
* [`@ldf/feature-summary`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/feature-summary): Feature that adds summaries to datasources.
* [`@ldf/feature-memento`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/feature-memento): Feature that enables datetime negotiation using the [Memento Protocol](http://mementoweb.org/about/).
* [`@ldf/datasource-hdt`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/datasource-hdt): Datasource that allows HDT files to be loaded.
* [`@ldf/datasource-jsonld`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/datasource-jsonld): Datasource that allows JSON-LD files to be loaded.
* [`@ldf/datasource-n3`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/datasource-n3): Datasource that allows [N-Quads](https://www.w3.org/TR/n-quads/), [N-Triples](https://www.w3.org/TR/n-triples/), [Trig](https://www.w3.org/TR/trig/) and [Turtle](https://www.w3.org/TR/turtle/) files to be loaded.
* [`@ldf/datasource-sparql`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/datasource-sparql): Datasource that allows SPARQL endpoints to be used as a data proxy.
* [`@ldf/datasource-composite`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/datasource-composite): Datasource that delegates queries to an sequence of other datasources.

## License
The Linked Data Fragments server is written by [Ruben Verborgh](https://ruben.verborgh.org/), Miel Vander Sande, [Ruben Taelman](https://www.rubensworks.net/) and colleagues.

This code is copyrighted by [Ghent University – imec](http://idlab.ugent.be/)
and released under the [MIT license](http://opensource.org/licenses/MIT).
