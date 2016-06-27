node default {

  class { 'nodejs': }

  class { 'chromium': }

  janus::role::standalone { 'janus':
    hostname => 'janus-gateway-js.dev.cargomedia.ch',
  }

  package { 'gulp':
    provider => 'npm',
    require  => Class['nodejs'],
  }
}
