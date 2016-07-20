module.exports = function(config) {
  config.set({

    basePath: '../',

    frameworks: ['mocha', 'chai'],

    customLaunchers: {
      headlessChrome: {
        base: 'Chrome',
        flags: ['--disable-web-security', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']
      }
    },

    files: [
      {pattern: 'test/integration/*.json', watched: true, served: true, included: false},
      'node_modules/jquery/dist/jquery.min.js',
      'dist/vendor.js',
      'dist/janus.js',
      'test/integration/*.js'
    ],

    exclude: [],

    reporters: ['progress'],

    port: 9876,

    colors: true,

    logLevel: config.LOG_DEBUG,

    autoWatch: false,

    browsers: ['headlessChrome'],

    singleRun: true,

    browserNoActivityTimeout: 60000,

    concurrency: Infinity
  })
};
