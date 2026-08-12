/*! @license MIT ©2014-2015 Ruben Verborgh and Ruben Taelman, Ghent University - imec */
let MemoryDatasource = require('../../lib/datasources/MemoryDatasource').MemoryDatasource;

let Datasource = require('../../lib/datasources/Datasource').Datasource,
    N3 = require('n3');

const dataFactory = N3.DataFactory;

describe('MemoryDatasource', () => {
  describe('The MemoryDatasource module', () => {
    it('should be a function', () => {
      MemoryDatasource.should.be.a('function');
    });

    it('should be a MemoryDatasource constructor', () => {
      new MemoryDatasource({ dataFactory }).should.be.an.instanceof(MemoryDatasource);
    });

    it('should be a Datasource constructor', () => {
      new MemoryDatasource({ dataFactory }).should.be.an.instanceof(Datasource);
    });
  });

  describe('A MemoryDatasource instance with a bare file path', () => {
    it('should prepend the file:// protocol', () => {
      let datasource = new MemoryDatasource({ dataFactory, file: '/tmp/example.ttl' });
      datasource._url.should.equal('file:///tmp/example.ttl');
    });
  });

  describe('A MemoryDatasource instance with an already-prefixed file path', () => {
    it('should leave the protocol untouched', () => {
      let datasource = new MemoryDatasource({ dataFactory, file: 'file:///tmp/example.ttl' });
      datasource._url.should.equal('file:///tmp/example.ttl');
    });
  });

  describe('A MemoryDatasource instance without an overridden _getAllQuads', () => {
    it('should error when initialized', (done) => {
      let datasource = new MemoryDatasource({ dataFactory });
      datasource.on('error', (error) => {
        error.message.should.equal('_getAllQuads is not implemented');
        done();
      });
      datasource.initialize();
    });
  });

  describe('A MemoryDatasource subclass whose _getAllQuads errors', () => {
    class FailingDatasource extends MemoryDatasource {
      _getAllQuads(addQuad, done) {
        done(new Error('could not read quads'));
      }
    }

    it('should error when initialized', (done) => {
      let datasource = new FailingDatasource({ dataFactory });
      datasource.on('error', (error) => {
        error.message.should.equal('could not read quads');
        done();
      });
      datasource.initialize();
    });
  });
});
