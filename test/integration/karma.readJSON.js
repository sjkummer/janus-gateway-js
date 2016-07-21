$.ajaxPrefilter(function(options) {
  if ('json' == options.dataType) {
    options.url = '/base/test/integration/' + options.url;
  }
});
