# Linked Data Fragments Server
<img src="http://linkeddatafragments.org/images/logo.svg" width="200" align="right" alt="" />

[![Build Status](https://travis-ci.org/LinkedDataFragments/Server.js.svg?branch=master)](https://travis-ci.org/LinkedDataFragments/Server.js)
[![Coverage Status](https://coveralls.io/repos/github/LinkedDataFragments/Server.js/badge.svg?branch=master)](https://coveralls.io/github/LinkedDataFragments/Server.js?branch=master)
[![npm version](https://badge.fury.io/js/ldf-server.svg)](https://www.npmjs.com/package/ldf-server)
[![Docker Automated Build](https://img.shields.io/docker/automated/linkeddatafragments/server.js.svg)](https://hub.docker.com/r/linkeddatafragments/server.js/)
[![DOI](https://zenodo.org/badge/16891600.svg)](https://zenodo.org/badge/latestdoi/16891600)

On today's Web, Linked Data is published in different ways,
which include [data dumps](http://downloads.dbpedia.org/3.9/en/),
[subject pages](http://dbpedia.org/page/Linked_data),
and [results of SPARQL queries](http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query=CONSTRUCT+%7B+%3Fp+a+dbpedia-owl%3AArtist+%7D%0D%0AWHERE+%7B+%3Fp+a+dbpedia-owl%3AArtist+%7D&format=text%2Fturtle).
We call each such part a [**Linked Data Fragment**](http://linkeddatafragments.org/).

The issue with the current Linked Data Fragments
is that they are either so powerful that their servers suffer from low availability rates
([as is the case with SPARQL](http://sw.deri.org/~aidanh/docs/epmonitorISWC.pdf)),
or either don't allow efficient querying.

Instead, this server offers **[Triple Pattern Fragments](http://www.hydra-cg.com/spec/latest/triple-pattern-fragments/)**.
Each Triple Pattern Fragment offers:

- **data** that corresponds to a _triple pattern_
  _([example](http://data.linkeddatafragments.org/dbpedia?subject=&predicate=rdf%3Atype&object=dbpedia-owl%3ARestaurant))_.
- **metadata** that consists of the (approximate) total triple count
  _([example](http://data.linkeddatafragments.org/dbpedia?subject=&predicate=rdf%3Atype&object=))_.
- **controls** that lead to all other fragments of the same dataset
  _([example](http://data.linkeddatafragments.org/dbpedia?subject=&predicate=&object=%22John%22%40en))_.

An example server is available at [data.linkeddatafragments.org](http://data.linkeddatafragments.org/).

TODO: briefly explain configurations

**If you just want to use this server, have a look at these default configurations**:
* TODO

This repository should be used by LDF Server module **developers** as it contains multiple LDF Server modules that can be composed.
This repository is managed as a [monorepo](https://github.com/babel/babel/blob/master/doc/design/monorepo.md)
using [Lerna](https://lernajs.io/).

## Install the server

TODO: basic installation, and refer to packages for more details

## Use the server

TODO: basic usage, and refer to packages for more details

## Development Setup

If you want to develop new features
or use the (potentially unstable) in-development version,
you can set up a development environment for this server.

LDF Server requires [Node.JS](http://nodejs.org/) 10.0 or higher and the [Yarn](https://yarnpkg.com/en/) package manager.
LDF Server is tested on OSX, Linux and Windows.

This project can be setup by cloning and installing it as follows:

```bash
$ git clone https://github.com/LinkedDataFragments/Server.js.git
$ cd comunica
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
The Linked Data Fragments server is written by [Ruben Verborgh](http://ruben.verborgh.org/) and colleagues.

This code is copyrighted by [Ghent University – imec](http://idlab.ugent.be/)
and released under the [MIT license](http://opensource.org/licenses/MIT).
