# Linked Data Fragments Server - Preset Quad Pattern Fragments
<img src="http://linkeddatafragments.org/images/logo.svg" width="200" align="right" alt="" />

[![npm version](https://badge.fury.io/js/%40ldf%2Fpreset-qpf.svg)](https://www.npmjs.com/package/@ldf/preset-qpf)

This package provides configuration presets for Quad Pattern Fragments servers.

This package should be used if you want to create your own LDF server configuration,
and include the default QPF configurations.
If you just want to run a QPF server, you can make use of [`@ldf/server`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/server) instead.

Concretely, it configures the following packages:

* [`@ldf/core`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/core): Core package of LDF servers.
* [`@ldf/feature-qpf`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/feature-qpf): Feature that enables [Quad Pattern Fragments](https://linkeddatafragments.org/specification/quad-pattern-fragments/) (a.k.a. [Triple Pattern Fragments](https://linkeddatafragments.org/specification/triple-pattern-fragments/)).
* [`@ldf/feature-summary`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/feature-summary): Feature that adds summaries to datasources.
* [`@ldf/feature-memento`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/feature-memento): Feature that enables datetime negotiation using the [Memento Protocol](http://mementoweb.org/about/).
* [`@ldf/datasource-hdt`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/datasource-hdt): Datasource that allows HDT files to be loaded.
* [`@ldf/datasource-jsonld`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/datasource-jsonld): Datasource that allows JSON-LD files to be loaded.
* [`@ldf/datasource-n3`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/datasource-n3): Datasource that allows [N-Quads](https://www.w3.org/TR/n-quads/), [N-Triples](https://www.w3.org/TR/n-triples/), [Trig](https://www.w3.org/TR/trig/) and [Turtle](https://www.w3.org/TR/turtle/) files to be loaded.
* [`@ldf/datasource-sparql`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/datasource-sparql): Datasource that allows SPARQL endpoints to be used as a data proxy.
* [`@ldf/datasource-composite`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/datasource-composite): Datasource that delegates queries to an sequence of other datasources.

_This package is a [Linked Data Fragments Server module](https://github.com/LinkedDataFragments/Server.js/)._

## Usage

When this module is used in a package other than `@ldf/server`,
then the JSON-LD context `https://linkedsoftwaredependencies.org/contexts/@ldf/preset-qpf.jsonld` must be imported.

The following configs will become available for import:

* [`"preset-qpf:config-defaults.json"`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/preset-qpf/config/config-defaults.json): Default configurations for QPF-related modules.
* [`"preset-qpf:sets/controllers.json"`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/preset-qpf/config/sets/controllers.json): Configurations for QPF controllers. (included in `"preset-qpf:config-defaults.json"`).
* [`"preset-qpf:sets/datasources.json"`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/preset-qpf/config/sets/datasources.json): Configurations for default datasources. (included in `"preset-qpf:config-defaults.json"`).
* [`"preset-qpf:sets/memento.json"`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/preset-qpf/config/sets/memento.json): Configurations for allowing Memento to be used. (included in `"preset-qpf:config-defaults.json"`).
* [`"preset-qpf:sets/prefixes.json"`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/preset-qpf/config/sets/prefixes.json): Configurations for default prefixes. (included in `"preset-qpf:config-defaults.json"`).
* [`"preset-qpf:sets/routers.json"`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/preset-qpf/config/sets/routers.json): Configurations for QPF routers. (included in `"preset-qpf:config-defaults.json"`).
* [`"preset-qpf:sets/summary.json"`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/preset-qpf/config/sets/summary.json): Configurations for allowing summaries. (included in `"preset-qpf:config-defaults.json"`).
* [`"preset-qpf:sets/views.json"`](https://github.com/LinkedDataFragments/Server.js/tree/master/packages/preset-qpf/config/sets/views.json): Configurations for QPF views. (included in `"preset-qpf:config-defaults.json"`).

Example: Importing all defaults:
```
{
  "@context": [
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/core/^3.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/preset-qpf/^3.0.0/components/context.jsonld"
  ],
  "@id": "urn:ldf-server:my",
  "import": "preset-qpf:config-defaults.json"

  // Rest of your config
}
```

Example: Importing only QPF controllers and datasources:
```
{
  "@context": [
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/core/^3.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/preset-qpf/^3.0.0/components/context.jsonld"
  ],
  "@id": "urn:ldf-server:my",
  "import": [
    "preset-qpf:config-defaults.json",
    "preset-qpf:sets/datasources.json"
  ]

  // Rest of your config
}
```

## License
The Linked Data Fragments server is written by [Ruben Verborgh](https://ruben.verborgh.org/), Miel Vander Sande, [Ruben Taelman](https://www.rubensworks.net/) and colleagues.

This code is copyrighted by [Ghent University – imec](http://idlab.ugent.be/)
and released under the [MIT license](http://opensource.org/licenses/MIT).
