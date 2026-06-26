    /**
     * Custom HTML plugin options.
     * @typedef {Object} CustomHtmlPluginOptions
     * @property {string} title - The title to be injected into the HTML.
     * @property {string} icon - The icon URL to be set as the favicon.
     * @property {string} base - The full base path (e.g. /admin/activepieces-instance/)
     */

    /**
     * @param {CustomHtmlPluginOptions} options
     */
    export default function customHtmlPlugin(options) {
      return {
        name: 'custom-html',
        transformIndexHtml: {
          order: 'pre',
          handler(html) {
            let newHtml = html.replace(/<%= apTitle %>/g, options.title || '');
            newHtml = newHtml.replace(/<%= apFavicon %>/g, options.icon || '');
            newHtml = newHtml.replace(
              /<%= apBase %>/g,
              options.base || '/'
            );
            return newHtml;
          },
        },
      };
    }
