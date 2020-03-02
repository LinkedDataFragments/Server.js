/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* Exports of the components of this package */

module.exports = {
  controllers: {
    AssetsController: require('./lib/controllers/AssetsController'),
    Controller: require('./lib/controllers/Controller'),
    DereferenceController: require('./lib/controllers/DereferenceController'),
    ErrorController: require('./lib/controllers/ErrorController'),
    NotFoundController: require('./lib/controllers/NotFoundController'),
  },
  datasources: {
    Datasource: require('./lib/datasources/Datasource'),
    EmptyDatasource: require('./lib/datasources/EmptyDatasource'),
    IndexDatasource: require('./lib/datasources/IndexDatasource'),
    MemoryDatasource: require('./lib/datasources/MemoryDatasource'),
  },
  routers: {
    DatasourceRouter: require('./lib/routers/DatasourceRouter'),
    PageRouter: require('./lib/routers/PageRouter'),
  },
  views: {
    error: {
      ErrorHtmlView: require('./lib/views/error/ErrorHtmlView'),
      ErrorRdfView: require('./lib/views/error/ErrorRdfView'),
    },
    forbidden: {
      ForbiddenHtmlView: require('./lib/views/forbidden/ForbiddenHtmlView'),
    },
    notfound: {
      NotFoundHtmlView: require('./lib/views/notfound/NotFoundHtmlView'),
      NotFoundRdfView: require('./lib/views/notfound/NotFoundRdfView'),
    },
    HtmlView: require('./lib/views/HtmlView'),
    RdfView: require('./lib/views/RdfView'),
    View: require('./lib/views/View'),
    ViewCollection: require('./lib/views/ViewCollection'),
  },
  runCli: require('./lib/CliRunner').runCli,
  runCustom: require('./lib/CliRunner').runCustom,
  LinkedDataFragmentsServer: require('./lib/LinkedDataFragmentsServer'),
  LinkedDataFragmentsServerWorker: require('./lib/LinkedDataFragmentsServerWorker'),
  UrlData: require('./lib/UrlData'),
  Util: require('./lib/Util'),
};
