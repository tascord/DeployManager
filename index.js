#!/usr/bin/env node

const { get_services, start, stop, get_setting, set_setting } = require('./src/lib');
const { cyanBright, redBright } = require('chalk');

let args = process.argv.slice(2);
let command = args.shift();

const commands = [
    [
        '--list-services',
        '-ls',
        'List all registered services'
    ],

    [
        '--help',
        '-h',
        'Displays DeployManager help'
    ],

    [
        '--start',
        '',
        'Start DeployManager'
    ],

    [
        '--stop',
        '',
        'Stop DeployManager'
    ],

    [
        '--testing',
        '',
        'Toggles testing mode'
    ],

    [
        '--blacklist',
        '-bl',
        'Blacklists a given port'
    ],

    [
        '--unblacklist',
        '-ubl',
        'Removes a port from the blacklist'
    ],

    [
        '--secret',
        '',
        'Sets or views the remote secret'
    ]
]

const format_string_array = (array, space_width = 1) => {
    const longest = Math.max.apply(null, array.map(c => Math.max.apply(null, c.map(c => c.length + space_width))));
    return array.map(c => c.map(s => Array(longest).fill(null).map((_, i) => s[i] || ' ').join('')).join('')).join('\n')
}

const title = (text) => {
    return Array(process.stdout.columns).fill(null).map((_, i) => i <= text.length ? text[i] || ' ' : '—').join('');
}

const display_help = () => console.log(`\n${cyanBright.bold(title('DeployManager Help'))}\nUsage: depm [COMMAND] [ARGUMENTS]\nCactiveNetwork Node.JS deployment manager.\n\n${format_string_array(commands)}`);

if (!command) return display_help();
let blacklisted = get_setting('blacklist') || [];

switch (command) {

    case '--debug':
        console.log(get_services())
        break;

    case '--secret':

        let secret = get_setting('secret') || Math.random().toString().replace('.', '');
        if(args[0]) {
            secret = args.join();
            console.log(`\n${cyanBright.bold(title('DeployManager'))}\nSecret updated.`);
        }

        else console.log(`\n${cyanBright.bold(title('DeployManager'))}\nStored secret: ${cyanBright(secret)}.`);
        set_setting('secret', secret);

    break;

    case '--blacklist':
    case '-bl':

        if (!args[0]) console.log(`\n${redBright.bold(title('DeployManager'))}\nNo blacklist port provided.`);
        else if (isNaN(args[0])) console.log(`\n${redBright.bold(title('DeployManager'))}\nNon numerical blacklist port provided.`);
        else if (blacklisted.indexOf(args[0]) !== -1) console.log(`\n${redBright.bold(title('DeployManager'))}\nPort already blacklisted.`);
        else {

            blacklisted.push(args[0]);
            set_setting('blacklist', blacklisted);

            console.log(`\n${cyanBright.bold(title('DeployManager'))}\nPort added to blacklist.\nBlacklisted ports: ${redBright(blacklisted.toString())}`);

        }

        break;

    case '--unblacklist':
    case '-ubl':

        if (!args[0]) console.log(`\n${redBright.bold(title('DeployManager'))}\nNo un-blacklist port provided.`);
        else if (isNaN(args[0])) console.log(`\n${redBright.bold(title('DeployManager'))}\nNon numerical un-blacklist port provided.`);
        else if (blacklisted.indexOf(args[0]) === -1) console.log(`\n${redBright.bold(title('DeployManager'))}\nPort not blacklisted.`);
        else {

            blacklisted = blacklisted.filter(p => p !== args[0]);
            set_setting('blacklist', blacklisted);

            console.log(`\n${cyanBright.bold(title('DeployManager'))}\nPort removed from blacklist.\nBlacklisted ports: ${redBright(blacklisted.toString())}`);

        }

        break;

    case '--testing':

        let status = !Boolean(get_setting('testing'));
        set_setting('testing', status);

        console.log(`\n${cyanBright.bold(title('DeployManager'))}\nDeployManager testing ${status ? 'enabled' : 'disabled'}.`);
        break;

    case '--list-services':
    case '-ls':

        let services = [['Service Name', 'Protocol', 'External URL', 'Port'], ...get_services().map(s => [s.name, s.protocol['cert_location'] ? 'HTTPS' : s.protocol, s.url, s.port.toString() || 'Discovering...'])];
        console.log(`\n${cyanBright.bold(title('Currently Active Services'))}\n${format_string_array(services)}`);

        break;

    case '--start':

        try {
            start(args[0] == '--force');
            console.log(`\n${cyanBright.bold(title('DeployManager'))}\nDeployManager started.`);
        }

        catch (e) {
            console.log(`\n${redBright.bold(title('DeployManager'))}\nDeployManager failed to start: ${e}\nTry running with ${cyanBright('--force')} flag if you know what you're doing.`);
        }

        process.exit(0);

        break;

    case '--stop':

        try {
            stop();
            console.log(`\n${cyanBright.bold(title('DeployManager'))}\nDeployManager stopped.`);
        }

        catch (e) {
            console.log(`\n${redBright.bold(title('DeployManager'))}\nDeployManager failed to stop: ${e}`);
        }

        break;

    case '--help':
    case '-h':
        display_help();
        break;

    default:
        console.log(`\n${redBright.bold(title('DeployManager'))}\nUnknown command '${command}'`);
        break;

}