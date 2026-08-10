/*! @license MIT ©2015-2016 Ruben Verborgh, Ghent University - imec */
/* View is a base class for objects that generate server responses. */

import { join } from 'path';
import type { DataFactory } from 'rdf-js';
import { ViewCollection } from './ViewCollection';
import type { LdfRequest, LdfResponse, RenderDone, ViewSettings } from '../types';

interface ContentTypeDescriptor {
  type: string;
  responseType: string;
  quality: number;
}

// Creates a view with the given name
export class View {
  name: string;
  supportedContentTypes!: ContentTypeDescriptor[];
  dataFactory?: DataFactory;

  protected _supportedContentTypeMatcher!: Record<string, boolean>;
  // Once construction is done, views has always been normalized to a real ViewCollection
  protected _defaults: ViewSettings & { views?: ViewCollection };

  constructor(viewName?: string, contentTypes?: string, defaults?: ViewSettings) {
    this.name = viewName || '';
    this._parseContentTypes(contentTypes);
    this._defaults = (defaults || {}) as ViewSettings & { views?: ViewCollection };
    this.dataFactory = this._defaults.dataFactory;
    if (defaults?.views)
      this._defaults.views = new ViewCollection(defaults.views as View[]);
  }

  // Parses a string of content types into an array of objects
  // i.e., 'a/b,q=0.7' => [{ type: 'a/b', responseType: 'a/b;charset=utf-8', quality: 0.7 }]
  // The "type" represents the MIME type,
  // whereas "responseType" contains the value of the Content-Type header with encoding.
  protected _parseContentTypes(contentTypes?: string): void {
    let matcher: Record<string, boolean> = this._supportedContentTypeMatcher = Object.create(null);
    let parsedContentTypes: ContentTypeDescriptor[] | undefined;
    if (typeof contentTypes === 'string') {
      parsedContentTypes = contentTypes.split(',').map((typeString) => {
        let contentType = typeString.match(/[^;,]*/)![0],
            responseType = contentType + ';charset=utf-8',
            quality = typeString.match(/;q=([0-9.]+)/);
        matcher[contentType] = matcher[responseType] = true;
        return {
          type: contentType,
          responseType: responseType,
          quality: quality ? Math.min(Math.max(parseFloat(quality[1]), 0.0), 1.0) : 1.0,
        };
      });
    }
    this.supportedContentTypes = parsedContentTypes || [];
  }

  // Indicates whether the view supports the given content type
  supportsContentType(contentType: string): boolean {
    return this._supportedContentTypeMatcher[contentType];
  }

  // Renders the view with the given options to the response
  render(options: ViewSettings, request: LdfRequest, response: LdfResponse, done?: RenderDone): void {
    // Initialize view-specific settings
    let settings: ViewSettings = { ...options, ...this._defaults };
    if (!settings.contentType)
      settings.contentType = response.getHeader('Content-Type') as string;

    // Export our base view, so it can be reused by other modules
    settings.viewPathBase = join(__dirname, 'base.html');

    // Render the view and end the response when done
    this._render(settings, request, response, (error) => {
      if (error)
        response.emit('error', error);
      response.end();
      done && done();
    });
  }

  // Gets extensions with the given name for this view
  protected _getViewExtensions(name: string, contentType?: string): View[] {
    let extensions: View[] = this._defaults.views ? this._defaults.views.getViews(this.name + ':' + name) : [];
    if (extensions.length) {
      extensions = extensions.filter((extension) => {
        return extension.supportsContentType(contentType!);
      });
    }
    return extensions;
  }

  // Renders the extensions with the given name for this view
  protected _renderViewExtensions(name: string, options: ViewSettings, request: LdfRequest, response: LdfResponse, done: RenderDone): void {
    let self = this, extensions = this._getViewExtensions(name, options.contentType), i = 0;
    (function next() {
      if (i < extensions.length)
        self._renderViewExtension(extensions[i++], options, request, response, next);
      else
        done();
    })();
  }

  // Renders the specified view extension
  protected _renderViewExtension(extension: View, options: ViewSettings, request: LdfRequest, response: LdfResponse, done: RenderDone): void {
    extension.render(options, request, response, done);
  }

  // Renders the view with the given settings to the response
  // (settings combines the view defaults with instance-specific options)
  protected _render(settings: ViewSettings, request: LdfRequest, response: LdfResponse, done: RenderDone): void {
    throw new Error('The _render method is not yet implemented.');
  }
}



