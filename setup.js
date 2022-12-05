const { exec, execSync } = require('child_process');
const config = require('./config.json');
const Logs = require('./modules/logs.js');

var setup = {
    RestartNginx: () => {
        console.log(Logs.info('Restarting nginx...'));
        execSync('whoami').toString().includes('root') ? execSync('service nginx restart') : execSync('sudo service nginx restart');
    },

    HasModule: (module) => {
        try {
            require.resolve(module);
            return true;
        } catch(e) {
            return false;
        }
    },

    InstallModules: (module) => {
        if(!setup.HasModule(module)){
            console.log(Logs.info('Installing module ' + module + '...'));

            exec('npm install ' + module, (err, stdout, stderr) => {
                if (err) {
                    console.error(err);
                    return;
                }
                if(stdout.includes('added')) {
                    console.log(Logs.success('Module ' + module + ' installed !'));
                }
            });
        }
    },
}

function WriteIncludeBlacklistFile() {
    console.log(Logs.info('Writing include blacklist file...'));

    const fs = require('fs');
    const chalk = require('chalk');

    const blacklist = fs.readFileSync('/etc/nginx/nginx.conf', 'utf8');
    const blacklist_array = blacklist.split('sendfile on;');
    fs.writeFileSync('/etc/nginx/nginx.conf', blacklist_array[0] + 'sendfile on;\ninclude ' + config.blacklist_file + ';\n' + blacklist_array[1]);
    console.log(Logs.success('Include blacklist file written !'));

    setup.RestartNginx();
}

function SetupBlacklistFile(){
    const fs = require('fs');
    const chalk = require('chalk');

    if(process.platform != "linux"){
        console.log(Logs.error('The installation did not work because you must be under linux.'));
        return false;
    }

    if (!fs.existsSync(config.blacklist_file)) {
        console.log(Logs.info('Creating blacklist file...'));
        fs.writeFileSync(config.blacklist_file, '');
        console.log(Logs.success('Blacklist file created !'));

        WriteIncludeBlacklistFile();
    }

}



if(process.argv[2] == '--firewalladd') {
    // récupérer le json et ajouter l'ip dans le fichier et sauvegarder en json
    const fs = require('fs');
    const chalk = require('chalk');
    const readline = require('readline');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    function Add() {
    fs.readFile('./config.json', 'utf8', function readFileCallback(err, data){
        if (err){
            console.log(err);
        }
        else {
            const json = JSON.parse(data);

            rl.question('Name of the rule (firewall1):', (name) => {
                json.firewall.forEach((rule) => {
                    if(rule.name == name) {
                        console.log(Logs.error('The name is already used !'));
                        rl.close();
                        process.exit();
                    }
                });

                rl.question('Entire path (/example/test.php):', (path) => {
                    rl.question('X times to be ratelimit (5):', (ratelimit) => {
                        rl.question('Time of the ban in second (90):', (time) => {
                            rl.question('Time in seconds to refresh the ip table (10):', (refresh) => {
                                json.firewall.push({
                                    "name": name,
                                    "enabled": true,
                                    "path": path,
                                    "ratelimit": ratelimit,
                                    "ratelimit_duration": time,
                                    "ratelimit_ban": refresh
                                });

                                rl.question('Do you want to save the rule ? (y/n):', (answer) => {
                                    if(answer == 'y') {
                                        fs.writeFileSync('./config.json', JSON.stringify(json, null, 4));
                                        console.clear();
                                        console.log(Logs.success('The rule ' + name + ' was well added !'));

                                        rl.question('Do you want to add another rule ? (y/n):', (another) => {
                                            if(another == 'y') {
                                                Add();
                                            } else {
                                                console.clear();
                                                console.log(Logs.info('Good Bye !'));
                                                rl.close();
                                            }
                                        });
                                    } else {
                                        rl.close();
                                        console.clear();
                                    }
                                });
                            });
                        });
                    });
                });
            });
        }
    });
    }
    Add();
} else if(process.argv[2] == '--help') {
   console.log(Logs.info('Usage:') + " node setup.js [--help --setup --firewalladd]");
} else if(process.argv[2] == '--setup') {
    config.modules.forEach(module => {
        console.log(Logs.info('Start installing module ' + module + '...'));
        InstallModule(module);
    });
}

if( !process.argv[2] ){
    console.log(Logs.info('Usage:') + " node setup.js [--help --setup --firewalladd]");
}