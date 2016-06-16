var Helpers = require('../helpers');

/**
 * @class TCrudPlugin
 * @extends Plugin
 */
var TCrudPlugin = {

  /**
   * @param {Object} options
   * @return {Promise}
   */
  _create: function(options) {
    var body = Helpers.extend({request: 'create'}, options);
    return this.sendWithDefaultTransaction({body: body})
      .catch(function(error) {
        if (error.message.indexOf('already exists') > 0) {
          return error.response;
        } else {
          throw error;
        }
      })
      .then(function(response) {
        return response['plugindata']['data'];
      });
  },

  /**
   * @param {Object} options
   * @return {Promise}
   */
  _destroy: function(options) {
    var body = Helpers.extend({request: 'destroy'}, options);
    return this.sendWithDefaultTransaction({body: body});
  },

  /**
   * @return {Promise}
   */
  _list: function() {
    return this.sendWithDefaultTransaction({body: {request: 'list'}})
      .then(function(response) {
        return response['plugindata']['data']['list'];
      });
  }
};


module.exports = TCrudPlugin;
