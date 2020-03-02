# Linked Data Fragments Server - JSON-LD Datasource
<img src="http://linkeddatafragments.org/images/logo.svg" width="200" align="right" alt="" />

This module contains a JSON-LD datasource for the [Linked Data Fragments server](https://github.com/LinkedDataFragments/Server.js).
It allows JSON-LD files to be loaded.

## Usage in `@ldf/server-qpf`

This package exposes the following config entries:
* `JsonLdDatasource`: A JSON-LD datasource that requires at least one `file` field. _Should be used as `@type` value._

Example:
```json
{
  "@context": "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/server-qpf/^3.0.0/components/context.jsonld",
  "@id": "urn:ldf-server:my",
  "import": "preset-qpf:config-defaults.json",

  "datasources": [
    {
      "@id": "ex:myJsonLdDatasource",
      "@type": "JsonLdDatasource",
      "datasourceTitle": "My JSON-LD file",
      "description": "My dataset with a JSON-LD back-end",
      "datasourcePath": "myjsonld",
      "file": "path/to/file.jsonld"
    }
  ]
}
```

## Usage in other packages

When this module is used in a package other than `@ldf/server-qpf`,
then the JSON-LD context `https://linkedsoftwaredependencies.org/contexts/@ldf/datasource-jsonld.jsonld` must be imported.

For example:
```
{
  "@context": [
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/core/^3.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/preset-qpf/^3.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/datasource-jsonld/^3.0.0/components/context.jsonld",
  ],
  // Same as above...
}
```

## License
The Linked Data Fragments server is written by [Ruben Verborgh](http://ruben.verborgh.org/) and colleagues.

This code is copyrighted by [Ghent University – imec](http://idlab.ugent.be/)
and released under the [MIT license](http://opensource.org/licenses/MIT).
