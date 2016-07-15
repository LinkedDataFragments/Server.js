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

First, create a configuration file `config.json` similar to `config-example.json`,
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

## Use HTTPS and WebID

The server can be configured to authenticate clients through [WebID](https://www.w3.org/wiki/WebID). WebID uses HTTPS and SSL certificates to create a trusted peer network.

### Create WebID, keys and certificates

To secure your server using HTTPS, you need certificates. To generate these, use the `./make-server-certificates.sh` script we included in the server software under the keys folder. Pay close attention to enter the correct information for your domain! The first argument of the script takes the FQDN (domain name) of your server, the second argument the port on which the server runs, and the third to sixth arguments the country, state, locale, and organization, respectively. For example:
```bash
./make-server-certificates.sh example.test.iminds.be \
8900 BE Oost-Vlaanderen Ghent iMinds
```

Alternatively, you could also generate the certificates manually, as follows:

1. Create the CA certificate

You'll need a Root Certificate Authority (private key) to sign the certificates of trusted clients.

```bash
openssl genrsa \
  -out certs/ca/my-root-ca.key.pem \
  2048
```

Self-sign your Root Certificate Authority by creating a certificate request.
Since this is private, the details can be anything you like.

```bash
openssl req \
  -x509 \
  -new \
  -nodes \
  -key certs/ca/my-root-ca.key.pem \
  -days 3652 \
  -out certs/ca/my-root-ca.crt.pem \
  -subj "/C=US/ST=Utah/L=Provo/O=ACME Signing Authority Inc/CN=example.com"
```

3. Create a server certificate


Create a private key to create certificates.

```bash
openssl genrsa \
  -out certs/server/my-server.key.pem \
  2048
```

Create a certificate request for your server.

```bash
openssl req -new \
    -key certs/server/my-server.key.pem \
    -out certs/tmp/my-server.csr.pem \
    -subj "/C=US/ST=Utah/L=Provo/O=ACME Service/CN=example.com"
```

Finally, sign the request from your server with your Root CA.

```bash
openssl x509 \
    -req -in certs/tmp/my-server.csr.pem \
    -CA certs/ca/my-root-ca.crt.pem \
    -CAkey certs/ca/my-root-ca.key.pem \
    -CAcreateserial \
    -out certs/server/my-server.crt.pem \
    -days 1095
```

### Configure the server

The server can be easily configured to use HTTPS in combination with WebID like so.

```json
{
  "protocol": "https",
  "ssl": {
    "keys" : {
      "key": "keys/certs/server/my-server.key.pem",
      "ca": ["keys/certs/server/my-root-ca.crt.pem"],
      "cert": "keys/certs/server/my-server.crt.pem"
    }
  }
}  
```

With this configuration, the server will use WebID Authentication over TLS to authenticate trusted clients.
Make sure the client's certificate is signed by your Root CA beforehand.

### Sign certificates from clients

To add a client to your pool of trusted peers, you must collect and sign its certificate before communicating.
After signing, you return the certificate to the client.

```bash
openssl x509 \
  -req -in certs/tmp/my-app-client.csr.pem \
  -CA certs/ca/my-root-ca.crt.pem \
  -CAkey certs/ca/my-root-ca.key.pem \
  -CAcreateserial \
  -out certs/client/my-app-client.crt.pem \
  -days 1095
```

To test your own server setup from the same machine, you can generate trusted client certificates using the ./make-trusted-client-certificates.sh script we included in the server software under the keys folder. The first argument of the script takes the FQDN (domain name) of your server, the second argument the WebID of the client, and the third to sixth arguments the country, state, locale, and organization, respectively. For example:
```bash
./make-trusted-client-certificates.sh combust.test.iminds.be \
“http:\/\/combust.test.iminds.be\/combusttestclient.ttl#webid” \
BE Oost-Vlaanderen Ghent iMinds
```
To test the setup, import the client certificates keys/certs/my-app-client.crt.pem  and keys/certs/my-app-client.p12 into your browser. Just make sure the client’s WebID includes the correct modulus, which you can obtain with the following command:
```bash
openssl rsa -in keys/certs/client/my-app-client.key.pem -modulus -noout
```

## License
The Linked Data Fragments server is written by [Ruben Verborgh](http://ruben.verborgh.org/).

This code is copyrighted by [iMinds – Ghent University](http://mmlab.be/)
and released under the [MIT license](http://opensource.org/licenses/MIT).
