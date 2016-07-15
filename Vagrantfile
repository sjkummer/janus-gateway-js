Vagrant.configure('2') do |config|
  config.ssh.forward_agent = true


  config.vm.define 'default', primary: true do |config|
    config.vm.box = 'cargomedia/ubuntu-1504-default'
    config.vm.synced_folder '.', '/home/vagrant/janus-gateway-js'

    config.vm.hostname = 'janus-gateway-js.dev.cargomedia.ch'
    if Vagrant.has_plugin? 'landrush'
      config.landrush.enable
      config.landrush.tld = 'dev.cargomedia.ch'
    end

    config.vm.provider "virtualbox" do |v|
      v.customize ["modifyvm", :id, "--accelerate3d", "on"]
      v.customize ["modifyvm", :id, "--audio", "null"]
      v.customize ["modifyvm", :id, "--audiocontroller", "hda"]
    end

    config.vm.network :forwarded_port, guest: 22, host: 22217, id: 'ssh'
    config.vm.network :private_network, ip: '10.10.11.17'

    config.librarian_puppet.puppetfile_dir = 'puppet'
    config.librarian_puppet.placeholder_filename = '.gitkeep'
    config.librarian_puppet.resolve_options = {:force => true}

    config.vm.provision :puppet do |puppet|
      puppet.environment_path = 'puppet/environments'
      puppet.environment = 'development'
      puppet.module_path = ['puppet/modules', 'puppet/environments/development/modules']
    end

    config.vm.provision 'shell', inline: [
        'sudo ln -sf /usr/lib/janus/plugins/libjanus_streaming.so /opt/janus-cluster/janus/usr/lib/janus/plugins.enabled/',
        'sudo cp /etc/janus/janus.plugin.streaming.cfg /opt/janus-cluster/janus/etc/janus/',
        'sudo ln -sf /usr/lib/janus/plugins/libjanus_audiobridge.so /opt/janus-cluster/janus/usr/lib/janus/plugins.enabled/',
        'sudo cp /etc/janus/janus.plugin.audiobridge.cfg /opt/janus-cluster/janus/etc/janus/',
        'sudo systemctl restart janus_janus',
    ].join(' && ')

  end
end
