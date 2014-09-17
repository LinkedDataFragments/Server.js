# Linked Data Fragments Server <img src="http://linkeddatafragments.org/images/logo.svg" width="100" align="right" alt="" />
On today's Web, Linked Data is published in different ways,
which include [data dumps](http://downloads.dbpedia.org/3.9/en/),
[subject pages](http://dbpedia.org/page/Linked_data),
and [results of SPARQL queries](http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query=CONSTRUCT+%7B+%3Fp+a+dbpedia-owl%3AArtist+%7D%0D%0AWHERE+%7B+%3Fp+a+dbpedia-owl%3AArtist+%7D&format=text%2Fturtle).
We call each such part a [**Linked Data Fragment**](http://linkeddatafragments.org/) of the dataset.

The issue with the current Linked Data Fragments
is that they are either so powerful that their servers suffer from low availability rates
([as is the case with SPARQL](http://sw.deri.org/~aidanh/docs/epmonitorISWC.pdf)),
or either don't allow efficient querying.

Instead, this server offers **Triple Pattern Fragments**.
Each Triple Pattern Fragment offers:

- **data** that corresponds to a _triple pattern_
  _([example](http://data.linkeddatafragments.org/dbpedia?subject=&predicate=rdf%3Atype&object=dbpedia-owl%3ARestaurant))_.
- **metadata** that consists of the (approximate) total triple count
  _([example](http://data.linkeddatafragments.org/dbpedia?subject=&predicate=rdf%3Atype&object=))_.
- **controls** that lead to all other fragments of the same dataset
  _([example](http://data.linkeddatafragments.org/dbpedia?subject=&predicate=&object=%22John%22%40en))_.

An example server is available at [data.linkeddatafragments.org](http://data.linkeddatafragments.org/).


## Installation

This server requires [Node.js](http://nodejs.org/) 0.10 or higher
and is tested on OSX and Linux.
To install, execute:
```bash
$ [sudo] npm install -g ldf-server
```


## Usage

### Configuration

First, create a configuration file `config.json` similar to `config-example.json`,
in which you detail your data sources.
For example, this configuration uses a SPARQL endpoint as data source:
```json
{
  "title": "My Linked Data Fragments server",
  "datasources": {
    "dbpedia": {
      "description": "DBpedia with a Virtuoso back-end",
      "type": "SparqlDatasource",
      "settings": ["http://dbpedia.org/sparql", "http://dbpedia.org"]
    }
  },

  "prefixes": {
    "rdf":         "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    "dbpedia":     "http://dbpedia.org/resource/",
    "dbpedia-owl": "http://dbpedia.org/ontology/"
  }
}
```

### Running the server

After creating a configuration file, execute
```bash
$ ldf-server config.json 5000 4
```
Here, `5000` is the HTTP port on which the server will listen,
and `4` the number of threads.

Now visit `http://localhost:5000/` in your browser.


### Supported data sources

A Linked Data Fragments server can currently publish triples from the following sources:

- `SparqlDatasource`: triples from a [SPARQL endpoint](http://www.w3.org/TR/rdf-sparql-protocol/)
- `LdfDatasource`: triples from a [Triple Pattern Fragments](http://linkeddatafragments.org/in-depth/#tpf) source
- `LevelGraphDatasource`: triples from a [LevelGraph](https://github.com/mcollina/levelgraph) database
- `JsonLdDatasource`: triples from a [JSON-LD](http://www.w3.org/TR/json-ld/) resource (URL or file)
- `N3Datasource`: triples from a [Turtle](http://www.w3.org/TR/turtle/) resource (URL or file)
- `CSVDatasource`: triples from a [CSV](http://tools.ietf.org/html/rfc4180) resource (URL or file)

The easiest way to add support for another datasource
is to implement a subclass of [`Datasource`](https://github.com/LinkedDataFragments/Server/blob/master/lib/Datasource.js).
<br>
[`N3Datasource`](https://github.com/LinkedDataFragments/Server/blob/master/lib/N3Datasource.js)
shows how to implement a non-queryable source;
[`LevelGraphDatasource`](https://github.com/LinkedDataFragments/Server/blob/master/lib/LevelGraphDatasource.js) is queryable.


## License
The Linked Data Fragments server is written by [Ruben Verborgh](http://ruben.verborgh.org/),
<br>
with CSV and Turtle data source support created by [Pieter Colpaert](https://twitter.com/pietercolpaert).

This code is copyrighted by [Multimedia Lab – iMinds – Ghent University](http://mmlab.be/)
and released under the [MIT license](http://opensource.org/licenses/MIT).
