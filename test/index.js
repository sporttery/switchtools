
var ssh_config = {
    host: '127.0.0.1',
    username: 'zhangwei',
    password: '876543219',
    port:22
};

var Client = require('ssh2').Client;

function showData(data){    
    console.log(data.toString());
}
var conn = new Client();
conn.on('ready', function() {
  console.log('Client :: ready');
  
  conn.shell(function(err, stream) {
    if (err) throw err;
    stream.on('close', function() {
      console.log('Stream :: close');
      conn.end();
    }).on('data', function(data) {
    //   console.log('OUTPUT: ' + data);
      showData(data);
    });
    stream.end('ls -l\ncd /\nls -l\nexit\n');
  });
}).connect(ssh_config);