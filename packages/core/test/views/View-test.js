/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
let View = require('../../lib/views/View'),
    resolve = require('path').resolve;

describe('View', () => {
  describe('The View module', () => {
    it('should be a function', () => {
      View.should.be.a('function');
    });

    it('should be a View constructor', () => {
      new View().should.be.an.instanceof(View);
    });
  });

  describe('A View instance', () => {
    describe('created without a name', () => {
      it('should have the empty string as name', () => {
        new View().should.have.property('name', '');
      });
    });

    describe('created with a name', () => {
      it('should set the name', () => {
        new View('MyView').should.have.property('name', 'MyView');
      });
    });

    describe('created without a name', () => {
      it('should have the empty string as name', () => {
        new View().should.have.property('name', '');
      });
    });

    describe('created without content types', () => {
      it('should have an empty array as supported content types', () => {
        new View().supportedContentTypes.should.deep.equal([]);
      });
    });

    describe('created with one content type', () => {
      it('should have an array with the supported content types', () => {
        new View('', 'text/html').supportedContentTypes.should.deep.equal([
          { type: 'text/html', responseType: 'text/html;charset=utf-8', quality: 1 },
        ]);
      });
    });

    describe('created with two content types', () => {
      it('should have an array with the supported content types', () => {
        new View('', 'text/html,text/plain').supportedContentTypes.should.deep.equal([
          { type: 'text/html',  responseType: 'text/html;charset=utf-8', quality: 1 },
          { type: 'text/plain', responseType: 'text/plain;charset=utf-8', quality: 1 },
        ]);
      });
    });

    describe('created with two content types with a quality parameter', () => {
      it('should have an array with the supported content types', () => {
        new View('', 'text/html,text/plain;q=0.4').supportedContentTypes.should.deep.equal([
          { type: 'text/html',  responseType: 'text/html;charset=utf-8',  quality: 1 },
          { type: 'text/plain', responseType: 'text/plain;charset=utf-8', quality: 0.4 },
        ]);
      });
    });

    describe('without _render method', () => {
      it('should throw an error on calling render', () => {
        let response = { getHeader: sinon.stub() };
        (function () { new View().render(null, null, response); })
          .should.throw('The _render method is not yet implemented.');
      });
    });

    describe('created without defaults', () => {
      it('should call _render with the given options', () => {
        let view = new View(),
            request = {}, response = { getHeader: sinon.stub().returns('text/html') },
            options = { a: 'b' };
        view._render = sinon.spy();
        view.render(options, request, response, noop);
        response.getHeader.should.have.been.calledOnce;
        response.getHeader.should.have.been.calledWith('Content-Type');
        view._render.getCall(0).args.should.have.length(4);
        view._render.should.have.been.calledOnce;
        view._render.getCall(0).args[0].should.deep.equal({
          a: 'b',
          contentType: 'text/html',
          viewPathBase: resolve(__dirname, '../../lib/views/base.html'),
        });
        view._render.getCall(0).args[1].should.equal(request);
        view._render.getCall(0).args[2].should.equal(response);
        view._render.getCall(0).args[3].should.be.an.instanceof(Function);
      });
    });

    describe('created with defaults', () => {
      it('should call _render with the combined defaults and options', () => {
        let view = new View(null, null, { c: 'd' }),
            request = {}, response = { getHeader: sinon.stub().returns('text/html') },
            options = { a: 'b' };
        view._render = sinon.spy();
        view.render(options, request, response, noop);
        response.getHeader.should.have.been.calledOnce;
        response.getHeader.should.have.been.calledWith('Content-Type');
        view._render.should.have.been.calledOnce;
        view._render.getCall(0).args.should.have.length(4);
        view._render.getCall(0).args[0].should.deep.equal({
          a: 'b',
          c: 'd',
          contentType: 'text/html',
          viewPathBase: resolve(__dirname, '../../lib/views/base.html'),
        });
        view._render.getCall(0).args[1].should.equal(request);
        view._render.getCall(0).args[2].should.equal(response);
        view._render.getCall(0).args[3].should.be.an.instanceof(Function);
      });
    });
  });
});

function noop() {}
