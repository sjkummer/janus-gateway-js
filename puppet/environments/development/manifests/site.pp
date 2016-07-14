node default {

  require ['nodejs', 'chromium', 'xvfb']

  ensure_packages(['x11vnc'], { provider => 'apt' })

  helper::script { 'install chrome driver':
    content => template('chromedriver/install.sh.erb'),
    unless  => 'ls /usr/bin/chromedriver',
    require => Class['chromium'],
  }

  daemon {
    'x11vnc':
      binary  => '/usr/bin/x11vnc',
      args    => '--listen 0.0.0.0 -rfbport 5900 -display :99 -forever',
      require => Service['xvfb'];
    'xvfb':
      binary => '/usr/bin/Xvfb',
      args   => '-ac :99 -screen 0 1280x1024x16';
    'chromedriver':
      binary  => '/usr/bin/chromedriver',
      args    => '--verbose --whitelisted-ips --url-base=wd/hub',
      env     => { 'DISPLAY' => ':99.0' },
      require => Service['xvfb'];
  }

  janus::role::standalone { 'janus':
    hostname => 'janus-gateway-js.dev.cargomedia.ch',
  }
}
