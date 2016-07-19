node default {

  require ['nodejs', 'xvfb']

  ensure_packages([
    'libpangocairo-1.0',
    'libnss3',
    'libcups2',
    'libgconf2-4',
    'libatk1.0-0',
    'libasound2',
    'libgtk2.0-0',
    'x11vnc',
  ],
    { provider => 'apt' })

  $chrome_Linux_x64_revision = '386257'

  helper::script {
    'install chrome browser':
      content => template('chrome/install.sh.erb'),
      unless  => 'ls /usr/bin/chrome';
    'install chrome driver':
      content => template('chromedriver/install.sh.erb'),
      unless  => 'ls /usr/bin/chromedriver',
      require => Helper::Script['install chrome browser'],
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
