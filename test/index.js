var Client = require('ssh2').Client;

var isIp = /^(172\.21\.)?\d{2,3}\.\d{1,3}$/;
var isMac = /^(((\w{4})\.){2})?\w{4}$/;
var coreSwitch = {
	host: '172.21.31.1',
	port: 22,
	username: 'admin',
	password: "xxxxx.com"
};
var appName = process.argv0;
// console.log(process.argv);


function exec(cmd, switchIp, cb) {
	if(typeof switchIp == "function"){
		cb = switchIp;
		switchIp = "";
	}
	if (typeof cb != "function") {
		console.log("要传一次函数处理响应数据");
		return;
	}
	let connSwitch = coreSwitch;
	if (isIp.test(switchIp)) {
		connSwitch = {
			host: switchIp,
			port: 22,
			username: 'admin',
			password: "xxxxx.com"
		}
	}

	console.log("host:", connSwitch.host, ",cmd:", cmd);
	var conn = new Client();
	conn.on('ready', function () {
		conn.shell(function (err, stream) {
			if (err) return;
			stream.on('close', function () {
				setTimeout(() => { conn.end(); }, 5000);
			}).on('data', function (data) {
				cb(data.toString());
			});
			stream.end(cmd);
		});
	}).connect(connSwitch);
}


function changeVlanIp(ip, vlan) {
	var cmd = "sh arp | inc " + ip + "\n";
	/*
	Internet  172.21.36.10            8   3ccd.365f.441d  ARPA   Vlan36
Internet  172.21.36.101          27   0c9d.92ca.4448  ARPA   Vlan36
Internet  172.21.36.104         150   00d8.6134.95c9  ARPA   Vlan36
	*/
	exec(cmd, (data) => {
		if (data.indexOf(ip) != -1) {
			var results = data.split(/\s+/g);
			if (results.length >= 5) {
				for(var i=0;i<results.length;i++){
					if(ip==results[i]){
						let mac = results[i+2];
						changeVlanMac(mac, vlan);
					}
				}
			}
		}
	});
}
let cacheMacFound = {};
function changeVlanMac(mac, vlan) {
	var cmd = "traceroute mac " + mac + " " + mac + "\n";
	/*
	Source 3ccd.365f.441d found on pitx-7F-2960-05
1 pitx-7F-2960-05 (172.21.31.15) : Gi0/31 => Gi0/31
Destination 3ccd.365f.441d found on pitx-7F-2960-05
Layer 2 trace completed
	*/
	exec(cmd,(data)=>{
		var results = data.split(/\s+/g);
		if(results.indexOf(mac)!=-1 && results.indexOf("found") !=-1){
			cacheMacFound[mac] = {};
		}
		if(cacheMacFound[mac]){
			for(var i=0;i<results.length;i++){
				let item = results[i];
				if(item[0]=="("){
					let switchIp = item.replace(/[()]/g,"");
					cacheMacFound[mac]["switchIp"] = switchIp;
				}
				if(item.startsWith("Gi")){
					let iPort = item;
					cacheMacFound[mac]["iPort"] = iPort;
				}
			}
			if(cacheMacFound[mac]["switchIp"]  && cacheMacFound[mac]["iPort"] ){
				console.log(mac,cacheMacFound[mac]);
				doChange(cacheMacFound[mac]["switchIp"],cacheMacFound[mac]["iPort"] ,vlan);
			}else{
				console.log("mac " + mac + " not found");
			}
		}		
	});

}

function doChange(switchIp,iPort,vlan){
	let cmd = "conf t\n";
	cmd += "int " + iPort + "\n";
	cmd += "sw acc vlan " + vlan + "\n";
	cmd += "shutdown\n";
	cmd += "no shutdown\n";
	cmd += "exit\nexit\n";
	exec(cmd,switchIp,(data)=>{		
		if(data.length==0 ){
			console.log("finish");
		}else {
			let tmp =  data.split(/#/g);
			if(tmp.length==2 && tmp[1]==""){
				console.log("finish");
			}else{
				process.stdout.write(".");
			}
		}
		
	});
	
}

function help(msg) {
	appName = appName.split(/\\/g).pop();
	console.log("参数错误 【" + msg + "】");
	console.log("需要带2个参数");
	console.log("第1个是IP,完整IP地址或者后面2段，如 172.21.36.36 或者 36.36；也可以使用 mac地址，全部mac地址或者后面4位，如 7ca1.aee5.45fa 或者 45fa");
	console.log("第2个是VlanID，如：56");
	console.log("支持以下4种方式 ：");
	console.log("IP方式 如: \n", appName, " 172.16.36.36 59");
	console.log(" ", appName, " 36.36 59");
	console.log("Mac方式 如: \n", appName, " 7ca1.aee5.45fa 59");
	console.log(" ", appName, " 45fa 59");
	process.exit(2);
}
function main() {
	var arg = process.argv[1];
	var vlan = process.argv[2];
	var ip = false;
	if (isIp.test(arg)) {
		if (arg.length == 5) {
			arg = "172.21." + arg;
		}
		console.log("ip:", arg, "切换到vlan:" + vlan);
		ip = true;
	} else if (isMac.test(arg)) {
		console.log("mac:", arg, "切换到vlan:" + vlan);
		if (arg.length == 4) {
			ip = true;
		}
	} else {
		if (process.argv.length == 4) {
			appName = process.argv[0] + " " + process.argv[1];
			arg = process.argv[2];
			vlan = process.argv[3];
			// console.log("结果:",arg,vlan);
			if (isIp.test(arg)) {
				if (arg.length == 5) {
					arg = "172.21." + arg;
				}
				console.log("ip:", arg, "切换到vlan:" + vlan);
				ip = true;
			} else if (isMac.test(arg)) {
				console.log("mac:", arg, "切换到vlan:" + vlan);
				if (arg.length == 4) {
					ip = true;
				}
			} else {
				help("不是ip也不是mac");
			}
		} else {
			help("参数个数不对");
		}
	}
	if (/^\d{1,}$/.test(vlan)) {
		if (ip) {
			changeVlanIp(arg, vlan);
		} else {
			changeVlanMac(arg, vlan);
		}
	} else {
		help("不正确的vlan");
	}


}

main();


