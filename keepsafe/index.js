var shell_exec = require('shell_exec').shell_exec;
const Tail = require('nodejs-tail');
const fs = require('fs')
const access_log = '/var/log/nginx/access.log';
const blacklist_file = '/etc/nginx/blacklist.conf';
const tail = new Tail(access_log);
const tableau_ip = [];
const tableau_ip_banned = [];

function getRndInteger(min, max) {
	return Math.floor(Math.random() * (max - min)) + min;
}

function BanIP(ip) {
	var already_banned = true
	const data = fs.readFileSync(blacklist_file, 'UTF-8');
	const lines = data.split('\n');
	lines.forEach(function (item) {
		if (tableau_ip_banned[ip] != undefined) {
			if (tableau_ip_banned[ip].spam === 1) return false;
		}
		var banned_this_ip = item.split('#')[0];
		banned_this_ip = banned_this_ip.replace('deny ', '');
		banned_this_ip = banned_this_ip.replace(';', '');
		if (banned_this_ip === ip) {
			already_banned = false;
			if (tableau_ip_banned[ip] === undefined) {
				tableau_ip_banned[ip] = {
					spam: 1
				};
			}
		}
	});
	if (already_banned == true) {
		//console.log(ip);
		setTimeout(function () {
			if (tableau_ip_banned[ip] != undefined) {
				if (tableau_ip_banned[ip].spam == 1) return false;
			}
			if (tableau_ip_banned[ip] === undefined) {
				tableau_ip_banned[ip] = {
					spam: 1
				};
			}
			console.log("Banned ip => " + ip);
			fs.appendFile(blacklist_file, "\ndeny " + ip + ";", function (erreur) {
				if (erreur) {
					console.log(erreur)
				}
			});
			already_banned = false;
			setTimeout(function () {
				shell_exec('/etc/init.d/nginx reload');
			}, getRndInteger(200, 500));
		}, getRndInteger(2000, 5000));
	}
}

function AddIpToVerif(ip, path) {

	var is_ok = false;

	if (tableau_ip[ip] === undefined) {
		tableau_ip[ip] = {
			count: 0,
			path: []
		};
		setTimeout(() => {
			delete tableau_ip[ip];
		}, 5000);
	}

	tableau_ip[ip].path.forEach(function (item) {
		if (path == item) {
			if (tableau_ip[ip].count > 6) {
				is_ok = true;
			}
		}
	});

	if (tableau_ip[ip].count > 9 && is_ok == true) {
		BanIP(ip);
	}

	if (tableau_ip[ip].count > 12) {
		BanIP(ip);
	}

	tableau_ip[ip].count += 1;
	tableau_ip[ip].path.push(path);
}

try {
	tail.on('line', (line) => {
		if (line) {

			const found = line.match(/^(\S+) (\S+) (\S+) \[([^:]+):(\d+:\d+:\d+) ([^\]]+)\] \"(\S+) (.*?) (\S+)\" (\S+) (\S+) (\".*?\") (\".*?\")$/);
			const found_ip = line.split('-');
			if (found) {
				if (found_ip[0] != null) {

					if (found[8] == null) return false;

					AddIpToVerif(found_ip[0], found[8].split('?')[0]); // ip | path     
				}
			}
		}
	});
} catch (e) {
	return false;
}

tail.on('close', () => {
	console.log('watching stopped');
});

tail.on('error', () => {
	console.log("e");
});

tail.watch();
