const chalk = require('chalk');
const Logs = {
    info: (message) => {
        return chalk.blue('[INFO] ') + message;
    },
    error: (message) => {
        return chalk.red('[ERROR] ') + message;
    },
    success: (message) => {
        return chalk.green('[SUCCESS] ') + message;
    },
    warning: (message) => {
        return chalk.yellow('[WARNING] ') + message;
    }
}

module.exports = Logs;