const fs = require('fs');
const chalk = require('chalk');
const Tail = require('nodejs-tail');
const { exec, execSync } = require('child_process');
const config = require('./config.json');
const Logs = require('./modules/logs.js');
var firewall = [];
var client = [];
var clientBanned = [];
var blacklist_data = "";
const tail = new Tail(config.access_log);
var runmode = "sudo";

if(config.firewall.length == 0){
    console.log(Logs.error('You have not yet made a firewall configuration'));
    return false;
}else{
    console.log(Logs.info('Getting the firewall...'));

    config.firewall.forEach(rule => {
        if(rule.enabled == true){

            console.log(Logs.info('Getting the firewall rule ' + rule.name + '...'));

            if (firewall[rule.path] === undefined) {

                firewall[rule.path] = {
                    ratelimit_limit: rule.ratelimit, // cdfrr
                    ratelimit_duration: rule.ratelimit_duration, // ddsr
                    ratelimit_ban: rule.ratelimit_ban, // dpqltr
                    client:[]
                };
            }

            console.log(Logs.success('Firewall rule ' + rule.name + ' added !'));

        }
    });

    if(execSync('whoami').toString().includes('root')){
        console.log(Logs.success('The script will restart nginx in root mode')); 
        runmode = "";
    }else{
        console.log(Logs.warning('The script will restart nginx in sudo mode'));
    }
}

function RestartNginx() {
    console.log(Logs.info('Restarting nginx...'));
    setTimeout(function () {
        exec('/etc/init.d/nginx ' + runmode + ' reload', (err, stdout, stderr) => {
            if (err) {
                console.log(err);
                console.log(Logs.error('Error restarting nginx'));
                return;
            }
        });
    }, 500);
}

function UpdateBannedList(){
    const data = fs.readFileSync(config.blacklist_file, 'UTF-8');
	const lines = data.split('\n');
    change = false;
    blacklist_data = data;

	lines.forEach(function (item) {
        if(item != ''){

            let ip = item.split('deny')[1].split(';')[0].trim();
            let time_to_ban = item.split('#')[1];
            let date = new Date();
            let time = date.getTime();
            
            if(ip != ''){
                if(time_to_ban < time){
                    console.log(Logs.success('The ip ' + ip + ' has been unbanned'));
                    blacklist_data = blacklist_data.replace(item, '').replace(/(^[ \t]*\n)/gm, "");
                    change = true;

                }
            }
        }
    });

    fs.writeFile(config.blacklist_file, blacklist_data, 'utf8', function (err) {
        if (err) return console.log(err);
    });
    
    if(change == true){
        RestartNginx();
    }
}

function BanIp(ip, path){
    
    let date = new Date();
    let time = date.getTime();
    let time2 = time + firewall[path].ratelimit_duration * 1000;

    fs.readFile(config.blacklist_file, function (err, data) {
        if (err) throw err;
        if(!data.includes(ip)){
            if(clientBanned[ip]){
                return false;
            }
            
            if(clientBanned[ip] === undefined){
                clientBanned[ip] = {
                    count: 1,
                };

                setTimeout(() => {
                    delete clientBanned[ip];
                }, firewall[path].ratelimit_duration * 1000);
            }

            fs.appendFile(config.blacklist_file, '\ndeny ' + ip.trim() + ' ;#' + time2, function (err) {
                if (err) throw err;
            });


            
            console.log(Logs.error('The ip ' + ip + ' has been banned for ' + firewall[path].ratelimit_duration + ' seconds for the path ' + path));
            UpdateBannedList();
            RestartNginx();
        }
    });
}

function Random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


function Verification(ip, path){
    if(firewall[path] === undefined){
        return false;
    }

    if(firewall[path].client[ip] === undefined){
        firewall[path].client[ip] = {
            count: 1,
        };

        setTimeout(() => {
            delete firewall[path].client[ip];
        }, firewall[path].ratelimit_ban * 1000);
    }

    firewall[path].client[ip].count += 1;

    if(firewall[path].client[ip].count >= firewall[path].ratelimit_limit){
        setTimeout(() => {
            BanIp(ip, path);
        }, Random(100, 500));
    };
}


tail.on('line', (line) => {
	if (line) {

		const found = line.match(/^(\S+) (\S+) (\S+) \[([^:]+):(\d+:\d+:\d+) ([^\]]+)\] \"(\S+) (.*?) (\S+)\" (\S+) (\S+) (\".*?\") (\".*?\")$/);
		const found_ip = line.split('-');
        //console.log(line);
		if (found) {
			if ((found_ip[0] != null) && (found[8] != null)) {

                Verification(found_ip[0], found[8].split('?')[0]); // ip | path |   
			}
		}
	}
});


tail.on('close', () => {
	console.log(Logs.error('The script was stopped.'));
});

tail.on('error', () => {
	console.log(Logs.error('The access log file is not found.'));
});

tail.watch();
UpdateBannedList();
RestartNginx();
setInterval(UpdateBannedList, 2000);