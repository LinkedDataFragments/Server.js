# Linked Data Fragments Server - HDT Datasource
<img src="http://linkeddatafragments.org/images/logo.svg" width="200" align="right" alt="" />

This module contains a HDT datasource for the [Linked Data Fragments server](https://github.com/LinkedDataFragments/Server.js).
It allows HDT files to be loaded.

## Usage in `@ldf/server-qpf`

This package exposes the following config entries:
* `HdtDatasource`: An HDT datasource that requires at least one `hdtFile` field. _Should be used as `@type` value._
* `hdtFile`: Refers to an absolute or relative file location of an HDT file. _Should be used as key in a `HdtDatasource`._
* `hdtExternal`: An optional flag that can be set to `true`, which will make HDT queries go via an external process. _Should be used as key in a `HdtDatasource`._

Example:
```json
{
  "@context": "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/server-qpf/^3.0.0/components/context.jsonld",
  "@id": "urn:ldf-server:my",
  "@type": "Server",
  "import": "preset-qpf:config-defaults.json",

  "datasources": [
    {
      "@id": "ex:myHdtDatasource",
      "@type": "HdtDatasource",
      "datasourceTitle": "My HDT file",
      "description": "My dataset with an HDT back-end",
      "datasourcePath": "myhdt",
      "hdtFile": "path/to/file.hdt"
    }
  ]
}
```

## Usage in other packages

When this module is used in a package other than `@ldf/server-qpf`,
then the JSON-LD context `https://linkedsoftwaredependencies.org/contexts/@ldf/datasource-hdt.jsonld` must be imported.

For example:
```
{
  "@context": [
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/core/^3.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/preset-qpf/^3.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/@ldf/datasource-hdt/^3.0.0/components/context.jsonld",
  ],
  // Same as above...
}
```

## License
The Linked Data Fragments server is written by [Ruben Verborgh](http://ruben.verborgh.org/) and colleagues.

This code is copyrighted by [Ghent University – imec](http://idlab.ugent.be/)
and released under the [MIT license](http://opensource.org/licenses/MIT).
