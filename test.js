const { WebImplementation } = require('./src/lib');

let dash = new WebImplementation(
    'Xeno-Dashboard',
    'HTTP',
    'xeno.cactive.network'
)

dash.on('ready', () => {
    console.log('bruh');
})