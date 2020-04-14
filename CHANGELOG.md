# Changelog
All notable changes to this project will be documented in this file.

<a name="v3.0.7"></a>
## [v3.0.7](https://github.com/LinkedDataFragments/Server.js/compare/v3.0.6...v3.0.7) - 2020-04-14

### Fixed
* [Fix blank node prefixes in datasources not being relative to base](https://github.com/LinkedDataFragments/Server.js/commit/cf8ee9e9586a0643fde5619b93098a11035b7c78)

<a name="v3.0.6"></a>
## [v3.0.6](https://github.com/LinkedDataFragments/Server.js/compare/v3.0.5...v3.0.6) - 2020-04-10

### Fixed
* [Fix datasource descriptions being migrated incorrectly](https://github.com/LinkedDataFragments/Server.js/commit/8a54d95c5b67ad09ab626a678388995df366db02)

<a name="v3.0.5"></a>
## [v3.0.5](https://github.com/LinkedDataFragments/Server.js/compare/v3.0.4...v3.0.5) - 2020-04-10

### Fixed
* [Fix enabled option on datasources being ignored](https://github.com/LinkedDataFragments/Server.js/commit/bf09c363e7c3094e7668b3dc18051bc0489f3ca2)
* [Fix HDT source configs not being migrated correctly](https://github.com/LinkedDataFragments/Server.js/commit/bd52749d513732ee74be44af8012cebb6beff02e)

<a name="v3.0.4"></a>
## [v3.0.4](https://github.com/LinkedDataFragments/Server.js/compare/v3.0.3...v3.0.4) - 2020-04-10

### Fixed
* [Remove need for softlinks in N3 datasources](https://github.com/LinkedDataFragments/Server.js/commit/2e260c560e0c3a75fedf1817690dd7a7dd2d6cca)
* [Fix hide and enabled config entries not being migrated properly](https://github.com/LinkedDataFragments/Server.js/commit/b298789619fac911db89f1f00b736652c1bdc0cb)

<a name="v3.0.3"></a>
## [v3.0.3](https://github.com/LinkedDataFragments/Server.js/compare/v3.0.2...v3.0.3) - 2020-04-10

### Fixed
* [Fix migration tool failing to include datasource metadata](https://github.com/LinkedDataFragments/Server.js/commit/9ba4c2f077f8800c1a5f2b06935641c3b1ada513)

<a name="v3.0.2"></a>
## [v3.0.2](https://github.com/LinkedDataFragments/Server.js/compare/v3.0.1...v3.0.2) - 2020-04-10

### Fixed
* [Fix migration tool handling relative paths incorrectly](https://github.com/LinkedDataFragments/Server.js/commit/34c0215d294f4cd8d3a8de1658decbe915ce63aa)

<a name="v3.0.1"></a>
## [v3.0.1](https://github.com/LinkedDataFragments/Server.js/compare/v3.0.0...v3.0.1) - 2020-04-10

### Changed
* [Disable QPF support for datasources in migration tool](https://github.com/LinkedDataFragments/Server.js/commit/747b6adf1e049b25889f1e4c5b40c239cd528fdc)

### Fixed
* [Fix sources querying for all graphs even if QPF is disabled](https://github.com/LinkedDataFragments/Server.js/commit/45fd2ca63283ec51c8cf93147a755de254c1f579)
* [Fix incorrect visualization of pattern string in HTML](https://github.com/LinkedDataFragments/Server.js/commit/516f009c191f845eb7afa057fcfb6b20362f9e65)

<a name="v3.0.0"></a>
## [v3.0.0](https://github.com/LinkedDataFragments/Server.js/compare/v2.2.5...v3.0.0) - 2020-04-08

### Added
* [Implement Quad Pattern Fragments](https://github.com/LinkedDataFragments/Server.js/commit/f2547b18aaac74b1b3aa01ebfe46ea519d9d098f)
* [Bump JSON-LD dependencies to add support for JSON-LD 1.1](https://github.com/LinkedDataFragments/Server.js/commit/2f365156d24b55277e941ca3a0f78e9796757056)
* [Add config migration tool](https://github.com/LinkedDataFragments/Server.js/commit/be6a7ec54417b9cae21e5c5093a90ab5a4f4d255)
* [Add SparqlDatasource option to force typed literals](https://github.com/LinkedDataFragments/Server.js/commit/b38026fd32bc4034c4aca36dac1c7f024d175b29)

### Changed
* [Modularize all packages through dependency injection](https://github.com/LinkedDataFragments/Server.js/commit/8671d98fa29672921a654cda1c1d4f19e076b883)
* [Refactor codebase to use RDFJS terms instead of strings](https://github.com/LinkedDataFragments/Server.js/commit/b014f67c55550260dc3f0032594c759bf570e983)
* [Set minimum Node version to 10](https://github.com/LinkedDataFragments/Server.js/commit/4dd1728b978e27370f91fa065d7fc06d46ed78a1)

### Fixed
* [Fix literals from Virtuoso endpoints being seen as URIs, Closes #94](https://github.com/LinkedDataFragments/Server.js/commit/cba41cdce43deea9e4106b5976608769db879cfb)

<a name="v2.2.5"></a>
## [v2.2.5] - 2010-01-015

_Start tracking changelog_
