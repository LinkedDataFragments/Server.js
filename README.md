# Linked Data Fragments Server <img src="http://linkeddatafragments.org/images/logo.svg" width="100" align="right" alt="" />
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


## Install the server

This server requires [Node.js](http://nodejs.org/) 0.10 or higher
and is tested on OSX and Linux.
To install, execute:
```bash
$ [sudo] npm install -g ldf-server
```


## Use the server

### Configure the data sources

First, create a configuration file `config.json` similar to `config/config-example.json`,
in which you detail your data sources.
For example, this configuration uses an [HDT file](http://www.rdfhdt.org/)
and a [SPARQL endpoint](http://www.w3.org/TR/sparql11-protocol/) as sources:
```json
{
  "title": "My Linked Data Fragments server",
  "datasources": {
    "dbpedia": {
      "title": "DBpedia 2014",
      "type": "HdtDatasource",
      "description": "DBpedia 2014 with an HDT back-end",
      "settings": { "file": "data/dbpedia2014.hdt" }
    },
    "dbpedia-sparql": {
      "title": "DBpedia 3.9 (Virtuoso)",
      "type": "SparqlDatasource",
      "description": "DBpedia 3.9 with a Virtuoso back-end",
      "settings": { "endpoint": "http://dbpedia.restdesc.org/", "defaultGraph": "http://dbpedia.org" }
    }
  }
}
```

The following sources are supported out of the box:
- HDT files ([`HdtDatasource`](https://github.com/LinkedDataFragments/Server.js/blob/master/lib/datasources/HdtDatasource.js) with `file` setting)
- N-Triples documents ([`TurtleDatasource`](https://github.com/LinkedDataFragments/Server.js/blob/master/lib/datasources/TurtleDatasource.js) with `url` setting)
- Turtle documents ([`TurtleDatasource`](https://github.com/LinkedDataFragments/Server.js/blob/master/lib/datasources/TurtleDatasource.js) with `url` setting)
- JSON-LD documents ([`JsonLdDatasource`](https://github.com/LinkedDataFragments/Server.js/blob/master/lib/datasources/JsonLdDatasource.js) with `url` setting)
- SPARQL endpoints ([`SparqlDatasource`](https://github.com/LinkedDataFragments/Server.js/blob/master/lib/datasources/SparqlDatasource.js) with `endpoint` and optionally `defaultGraph` settings)

Support for new sources is possible by implementing the [`Datasource`](https://github.com/LinkedDataFragments/Server.js/blob/master/lib/datasources/Datasource.js) interface.

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

## License
The Linked Data Fragments server is written by [Ruben Verborgh](http://ruben.verborgh.org/).

## License
The Linked Data Fragments client is written by [Ruben Verborgh](http://ruben.verborgh.org/) and colleagues.

This code is copyrighted by [Ghent University – iMinds](http://datasciencelab.ugent.be/)
and released under the [MIT license](http://opensource.org/licenses/MIT).
