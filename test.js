const { WebImplementation, HTTPS } = require('./src/lib');

(() => {

  let id = Date.now();

  const server = new WebImplementation(
    id,
    new HTTPS('bruh', 'bruh', true),
    'tascord.ai',
    '/',
    true
  );

  console.log('ID: ' + id);

})();
