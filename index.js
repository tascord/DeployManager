const { get_services } = require('./src/lib');
const { cyanBright, bold, redBright } = require('chalk');

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

if(!command) return display_help();

switch (command) {

    case '--list-services':
    case '-ls':

        let services = [['Service Name', 'Protocol', 'External URL', 'URL Path', 'Port'], ...get_services().map(s => Object.entries(s).reduce((p, a) => p.concat(a[1].toString()), []))];
        console.log(`\n${cyanBright.bold(title('Currently Active Services'))}\n${format_string_array(services)}`);

        break;

    case '--help':
    case '-h':
        display_help();
        break;

    default:
        console.log('bruh');
        break;

}