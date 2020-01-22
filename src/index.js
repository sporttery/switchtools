var Client = require('ssh2').Client;

var conn1 = new Client();
var conn2 = new Client();

// Checks uptime on 10.1.1.40 via 192.168.1.1

conn1.on('ready', function () {
    console.log('FIRST :: connection ready');
    // Alternatively, you could use netcat or socat with exec() instead of
    // forwardOut()
    conn1.forwardOut('127.0.0.1', 12345, '127.0.0.1', 22, function (err, stream) {
        if (err) {
            console.log('FIRST :: forwardOut error: ' + err);
            return conn1.end();
        }
        conn2.connect({
            sock: stream,
            username: 'zhangwei',
            password: '876543219',
        });
    });
}).connect({
    host: '127.0.0.1',
    username: 'zhangwei',
    password: '876543219',
});

conn2.on('ready', function () {
    console.log('SECOND :: connection ready');
    conn2.exec('uptime', function (err, stream) {
        if (err) {
            console.log('SECOND :: exec error: ' + err);
            return conn1.end();
        }
        stream.on('end', function () {
            conn1.end(); // close parent (and this) connection
        }).on('data', function (data) {
            console.log(data.toString());
        });
    });
});