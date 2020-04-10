# Linked Data Fragments Server
<img src="http://linkeddatafragments.org/images/logo.svg" width="200" align="right" alt="" />

[![Build Status](https://travis-ci.org/LinkedDataFragments/Server.js.svg?branch=master)](https://travis-ci.org/LinkedDataFragments/Server.js)
[![Coverage Status](https://coveralls.io/repos/github/LinkedDataFragments/Server.js/badge.svg?branch=master)](https://coveralls.io/github/LinkedDataFragments/Server.js?branch=master)
[![npm version](https://badge.fury.io/js/%40ldf%2Fserver.svg)](https://www.npmjs.com/package/@ldf/server)
[![DOI](https://zenodo.org/badge/16891600.svg)](https://zenodo.org/badge/latestdoi/16891600)

This repository contains modules for [Linked Data Fragments (LDF)](https://linkeddatafragments.org/) servers.

_Find more information about migrating from `ldf-server` 2.x.x [on our wiki](https://github.com/LinkedDataFragments/Server.js/wiki/Release-3.0.0)._

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
(a.k.a. **[Triple Pattern Fragments](https://linkeddatafragments.org/specification/triple-pattern-fragments/)**).
Each Quad Pattern Fragment offers:

- **data** that corresponds to a _quad/triple pattern_
  _([example](http://data.linkeddatafragments.org/dbpedia?subject=&predicate=rdf%3Atype&object=dbpedia-owl%3ARestaurant))_.
- **metadata** that consists of the (approximate) total triple count
  _([example](http://data.linkeddatafragments.org/dbpedia?subject=&predicate=rdf%3Atype&object=))_.
- **controls** that lead to all other fragments of the same dataset
  _([example](http://data.linkeddatafragments.org/dbpedia?subject=&predicate=&object=%22John%22%40en))_.

An example server is available at [data.linkeddatafragments.org](http://data.linkeddatafragments.org/).

## Quick Start

The easiest way to start using this server is via
[`@ldf/server`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/server). _(previously known as `ldf-server`)_

### Install the server

This server requires [Node.js](http://nodejs.org/) 10.0 or higher
and is tested on OSX and Linux.
To install, execute:
```bash
$ [sudo] npm install -g @ldf/server
```

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

_More details on how to configure this server can be found in the README of [`@ldf/server`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/server)._

### Start the server

After creating a configuration file, execute
```bash
$ ldf-server config.json 5000 4
```
Here, `5000` is the HTTP port on which the server will listen,
and `4` the number of worker processes.

Now visit `http://localhost:5000/` in your browser.

## Configure your own server 

This repository should be used by LDF Server module **developers** as it contains multiple LDF Server modules that can be composed.
We manage this repository as a [monorepo](https://github.com/babel/babel/blob/master/doc/design/monorepo.md)
using [Lerna](https://lernajs.io/).

The following modules are available:
* [`@ldf/core`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/core): Shared functionality for LDF servers.
* [`@ldf/server`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/server): An LDF server with Quad/Triple Pattern Fragments support.
* [`@ldf/preset-qpf`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/preset-qpf): Configuration presets for Quad/Triple Pattern Fragments servers.
* [`@ldf/feature-qpf`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/feature-qpf): Feature that enables [Quad Pattern Fragments](https://linkeddatafragments.org/specification/quad-pattern-fragments/) (a.k.a. [Triple Pattern Fragments](https://linkeddatafragments.org/specification/triple-pattern-fragments/)).
* [`@ldf/feature-summary`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/feature-summary): Feature that adds summaries to datasources.
* [`@ldf/feature-memento`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/feature-memento): Feature that enables datetime negotiation using the [Memento Protocol](http://mementoweb.org/about/).
* [`@ldf/feature-webid`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/feature-webid): Feature that enables authenticated requests from clients with WebID.
* [`@ldf/datasource-hdt`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/datasource-hdt): Datasource that allows HDT files to be loaded.
* [`@ldf/datasource-jsonld`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/datasource-jsonld): Datasource that allows JSON-LD files to be loaded.
* [`@ldf/datasource-n3`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/datasource-n3): Datasource that allows [N-Quads](https://www.w3.org/TR/n-quads/), [N-Triples](https://www.w3.org/TR/n-triples/), [Trig](https://www.w3.org/TR/trig/) and [Turtle](https://www.w3.org/TR/turtle/) files to be loaded.
* [`@ldf/datasource-sparql`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/datasource-sparql): Datasource that allows SPARQL endpoints to be used as a data proxy.
* [`@ldf/datasource-composite`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/datasource-composite): Datasource that delegates queries to an sequence of other datasources.

These modules can be used to configure your own LDF server with the features you want.
As an example on how to make such a server,
you can have a look at [`@ldf/server`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/server),
which is a default server configuration that has all possible features enabled.

## Development Setup

If you want to develop new features
or use the (potentially unstable) in-development version,
you can set up a development environment for this server.

LDF Server requires [Node.JS](http://nodejs.org/) 10.0 or higher and the [Yarn](https://yarnpkg.com/en/) package manager.
LDF Server is tested on OSX, Linux and Windows.

This project can be setup by cloning and installing it as follows:

```bash
$ git clone https://github.com/LinkedDataFragments/Server.js.git
$ cd Server.js
$ yarn install
```

**Note: `npm install` is not supported at the moment, as this project makes use of Yarn's [workspaces](https://yarnpkg.com/lang/en/docs/workspaces/) functionality**

This will install the dependencies of all modules, and bootstrap the Lerna monorepo.
After that, all [LDF Server packages](https://github.com/LinkedDataFragments/Server.js/tree/master/packages) are available in the `packages/` folder
and can be used in a development environment.

Furthermore, this will add [pre-commit hooks](https://www.npmjs.com/package/pre-commit)
to build, lint and test.
These hooks can temporarily be disabled at your own risk by adding the `-n` flag to the commit command.

## License
The Linked Data Fragments server is written by [Ruben Verborgh](https://ruben.verborgh.org/), Miel Vander Sande, [Ruben Taelman](https://www.rubensworks.net/) and colleagues.

This code is copyrighted by [Ghent University – imec](http://idlab.ugent.be/)
and released under the [MIT license](http://opensource.org/licenses/MIT).
