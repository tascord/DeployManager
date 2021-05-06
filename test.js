const { WebImplementation } = require('./src/lib');

const server = new WebImplementation(
  'Test Application', // Name
  'HTTPS', // Protocol
  'tascord.ai', // External URL
);
