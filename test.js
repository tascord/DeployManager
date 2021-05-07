const { WebImplementation, HTTPS } = require('./src/lib');

const server = new WebImplementation(
  'Test Application', // Name
  'HTTP', // Protocol
  'tascord.ai', // External URL
  '/',
  true
);
