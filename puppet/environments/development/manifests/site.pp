node default {

  class { ['nodejs', 'chromium']: }

  janus::role::standalone { 'janus':
    hostname => 'janus-gateway-js.dev.cargomedia.ch',
  }

  package { ['gulp', 'testem']:
    provider => 'npm',
    require  => Class['nodejs'],
  }
}
