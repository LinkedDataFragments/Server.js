/*! @license MIT ©2015-2016 Ruben Verborgh - Ghent University / iMinds */
var View = require('../../lib/views/View');

describe('View', function () {
  describe('The View module', function () {
    it('should be a function', function () {
      View.should.be.a('function');
    });

    it('should be a View constructor', function () {
      new View().should.be.an.instanceof(View);
    });

    it('should create new View objects', function () {
      View().should.be.an.instanceof(View);
    });
  });

  describe('A View instance', function () {
    describe('created without a name', function () {
      it('should have the empty string as name', function () {
        new View().should.have.property('name', '');
      });
    });

    describe('created with a name', function () {
      it('should set the name', function () {
        new View('MyView').should.have.property('name', 'MyView');
      });
    });

    describe('created without a name', function () {
      it('should have the empty string as name', function () {
        new View().should.have.property('name', '');
      });
    });

    describe('created without content types', function () {
      it('should have an empty array as supported content types', function () {
        new View().supportedContentTypes.should.deep.equal([]);
      });
    });

    describe('created with one content type', function () {
      it('should have an array with the supported content types', function () {
        new View('', 'text/html').supportedContentTypes.should.deep.equal([
          { type: 'text/html', responseType: 'text/html;charset=utf-8', quality: 1 },
        ]);
      });
    });

    describe('created with two content types', function () {
      it('should have an array with the supported content types', function () {
        new View('', 'text/html,text/plain').supportedContentTypes.should.deep.equal([
          { type: 'text/html',  responseType: 'text/html;charset=utf-8', quality: 1 },
          { type: 'text/plain', responseType: 'text/plain;charset=utf-8', quality: 1 },
        ]);
      });
    });

    describe('created with two content types with a quality parameter', function () {
      it('should have an array with the supported content types', function () {
        new View('', 'text/html,text/plain;q=0.4').supportedContentTypes.should.deep.equal([
          { type: 'text/html',  responseType: 'text/html;charset=utf-8',  quality: 1 },
          { type: 'text/plain', responseType: 'text/plain;charset=utf-8', quality: 0.4 },
        ]);
      });
    });

    describe('without _render method', function () {
      it('should throw an error on calling render', function () {
        var response = { getHeader: sinon.stub() };
        (function () { new View().render(null, null, response); })
        .should.throw('The _render method is not yet implemented.');
      });
    });

    describe('created without defaults', function () {
      it('should call _render with the given options', function () {
        var view = new View(),
            request = {}, response = { getHeader: sinon.stub().returns('text/html') },
            options = { a: 'b' };
        view._render = sinon.spy();
        view.render(options, request, response, noop);
        response.getHeader.should.have.been.calledOnce;
        response.getHeader.should.have.been.calledWith('Content-Type');
        view._render.getCall(0).args.should.have.length(4);
        view._render.should.have.been.calledOnce;
        view._render.getCall(0).args[0].should.deep.equal({ a: 'b', contentType: 'text/html' });
        view._render.getCall(0).args[1].should.equal(request);
        view._render.getCall(0).args[2].should.equal(response);
        view._render.getCall(0).args[3].should.be.an.instanceof(Function);
      });
    });

    describe('created with defaults', function () {
      it('should call _render with the combined defaults and options', function () {
        var view = new View(null, null, { c: 'd' }),
            request = {}, response = { getHeader: sinon.stub().returns('text/html') },
            options = { a: 'b' };
        view._render = sinon.spy();
        view.render(options, request, response, noop);
        response.getHeader.should.have.been.calledOnce;
        response.getHeader.should.have.been.calledWith('Content-Type');
        view._render.should.have.been.calledOnce;
        view._render.getCall(0).args.should.have.length(4);
        view._render.getCall(0).args[0].should.deep.equal({ a: 'b', c: 'd', contentType: 'text/html' });
        view._render.getCall(0).args[1].should.equal(request);
        view._render.getCall(0).args[2].should.equal(response);
        view._render.getCall(0).args[3].should.be.an.instanceof(Function);
      });
    });
  });
});

function noop() {}
