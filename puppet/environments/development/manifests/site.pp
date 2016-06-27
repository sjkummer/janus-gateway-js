node default {

  class { 'nodejs': }

  janus::role::standalone { 'janus':
    hostname => 'janus-gateway-js.dev.cargomedia.ch',
  }
}
