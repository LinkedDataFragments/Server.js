/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* HtmlView is a base class for views that generate HTML responses. */

import { View } from './View';
import q = require('q');
import * as path from 'path';
import * as _ from 'lodash';
import * as RdfString from 'rdf-string';
import { UrlData } from '../UrlData';
import type { LdfRequest, LdfResponse, RenderDone, ViewSettings } from '../types';

interface Qejs {
  renderFile(fileName: string, options: ViewSettings): q.Promise<string>;
}
// qejs ships no types of its own and has no @types package.
const qejs = require('qejs') as Qejs;

// Creates a new HTML view with the given name and settings
export class HtmlView extends View {
  constructor(viewName?: string, settings?: ViewSettings) {
    settings = settings || {};
    settings.urlData = settings.urlData || new UrlData();
    let defaults: ViewSettings = {
      cache: true, RdfString: RdfString,
      assetsPath: settings.urlData.assetsPath || '/', baseURL: settings.urlData.baseURL || '/',
      title: '', header: settings && settings.title,
    };
    super(viewName, 'text/html', { ...settings, ...defaults });
  }

  // Renders the template with the given name to the response
  protected _renderTemplate(templateName: string, options: ViewSettings, request: LdfRequest, response: LdfResponse, done: RenderDone): void {
    // Initialize all view extensions
    let extensions: Record<string, unknown> = options.extensions || (options.extensions = {}), self = this;
    for (let extension in extensions) {
      if (!extensions[extension])
        extensions[extension] = this._renderViewExtensionContents(extension, options, request, response);
      else if (extensions[extension] === 'function')
        extensions[extension] = newExtensionViewConstructor(extension, options, request, response);
    }

    // Render the template with its options
    let fileName = (templateName[0] === '/' ? templateName : path.join(__dirname, templateName)) + '.html';
    void qejs.renderFile(fileName, options)
      .then((html: string) => { response.write(html); done(); })
      .fail((error: Error) => { done(error); });

    function newExtensionViewConstructor(extension: string, options: ViewSettings, request: LdfRequest, response: LdfResponse) {
      return function (data: Record<string, any>) {
        let subOptions = { ...options };
        for (let key in data)
          subOptions[key] = data[key];
        return self._renderViewExtensionContents(extension, subOptions, request, response);
      };
    }
  }

  // Renders the view extensions to a string, returned through a promise
  protected _renderViewExtensionContents(name: string, options: ViewSettings, request: LdfRequest, response: LdfResponse): PromiseLike<string> {
    let buffer = '', writer = { write: function (data: string) { buffer += data; }, end: _.noop };
    return q.ninvoke<void>(this, '_renderViewExtensions', name, options, request, writer)
      .then(() => { return buffer; });
  }
}

