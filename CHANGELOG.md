# Changelog
All notable changes to this project will be documented in this file.

<a name="v3.2.1"></a>
## [v3.2.1](https://github.com/LinkedDataFragments/Server.js/compare/v3.2.0...v3.2.1) - 2021-05-10

### Fixed
* [Fix illegal mutation of quads, Closes #137](https://github.com/LinkedDataFragments/Server.js/commit/a459b74c6411bc9d042a0e7d4caca079a349fe7f)

<a name="v3.2.0"></a>
## [v3.2.0](https://github.com/LinkedDataFragments/Server.js/compare/v3.1.0...v3.2.0) - 2021-01-15

### Changed
* [Update to Components.js 4](https://github.com/LinkedDataFragments/Server.js/commit/e90db5c3e439259466fa0cf789e2c4b028b584f2)

<a name="v3.1.0"></a>
## [v3.1.0](https://github.com/LinkedDataFragments/Server.js/compare/v3.0.9...v3.1.0) - 2020-08-10

### Changed
* [Update to asynciterator v3, Closes #129](https://github.com/LinkedDataFragments/Server.js/commit/b6e3512ec21bba5cfcac79aee52033034d49583b)

### Fixed
* [Fix missing rdf-string dependency in core, Closes #131](https://github.com/LinkedDataFragments/Server.js/commit/70021d26a4112a02278801ffff604ee803114369)

<a name="v3.0.9"></a>
## [v3.0.9](https://github.com/LinkedDataFragments/Server.js/compare/v3.0.8...v3.0.9) - 2020-06-18

### Changed
* [Update to HDT-Node 3.x.x](https://github.com/LinkedDataFragments/Server.js/commit/7ae079452f510f13631770282345688828dcc085)

<a name="v3.0.8"></a>
## [v3.0.8](https://github.com/LinkedDataFragments/Server.js/compare/v3.0.7...v3.0.8) - 2020-05-11

### Fixed
* [Fix crash due to changed function name in N3.js](https://github.com/LinkedDataFragments/Server.js/commit/ea3e7632cfd47e0ae9015f4715a15d40c61e87c8)

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
