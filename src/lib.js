const raw = require('quick.db')(require('path').join(__dirname, 'data.sqlite'));
const services = new raw.table('services');
const settings = new raw.table('settings');

// ---

const port_scan = require('portscanner');
const { readFileSync, writeFileSync, existsSync, unlinkSync } = require('fs');
const { execSync } = require('child_process');
const { join } = require('path');

// ---

const paths = {
    nginx: '/etc/nginx/sites-available/deploy-manager.conf',
    default_http: join(__dirname, '../', 'files', 'default_http.conf'),
    default_https: join(__dirname, '../', 'files', 'default_https.conf'),
    lock: join(__dirname, '../', 'files', 'dm.lck')
}

const defaults = {
    http: readFileSync(paths.default_http).toString(),
    https: readFileSync(paths.default_https).toString()
}

// ---

class HTTPS {

    /**
     * Set up a web applications HTTPS (SSL) data
     * @param {String} cert_location SSL fullchain.pem file 
     * @param {String} key_location  SSL privkey.pem file
     */
    constructor(cert_location, key_location) {

        this.cert_location = cert_location;
        this.key_location = key_location;

        if(!existsSync(cert_location)) throw new Error('SSL Certificate (fullchain) doesn\'t exist at provided location.');
        if(!existsSync(key_location)) throw new Error('SSL Certificate (privkey) doesn\'t exist at provided location.');

    }

}

class WebImplementation extends require('events').EventEmitter {

    /**
     * Setup a new web application
     * @param {String} name Applications name
     * @param {'HTTP'|HTTPS} protocol Public URL protocol
     * @param {String} url Applications public URL
     * @param {Boolean} force Whether or not to force application creation (if already registered)
     */
    constructor(name, protocol, url, force = false) {

        super();

        if (!lock.locked()) start();

        this.name = name;
        this.protocol = protocol;
        this.url = url;
        this.path = path;

        if (!this.name) throw new Error('Invalid web application name');
        if (this.protocol != 'HTTP' && !(this.protocol instanceof HTTPS)) throw new Error('Invalid protocol.');
        // if(this.url ? /^([a-z0-9].)+$/.test(this.url) : false) throw new Error('Invalid web URL');
        if (!this.path) throw new Error('Invalid path');
        if (services.has(name) && !force) throw new Error('A service by that name is already registered');

        services.set(name, {
            name: this.name,
            protocol: this.protocol,
            url: this.url,
            path: this.path
        })

        if (!this.path.startsWith('/')) this.path = '/' + this.path;

        port_scan.findAPortNotInUse(3000, 8000, '127.0.0.1', (error, port) => {

            if (error) throw new Error(`Error sweeping ports: ${error}`);
            this.port = port;

            services.set(`${name}.port`, this.port);

            this.modify_nginx_config();
            this.emit('ready');

        })

    }


    modify_nginx_config = () => {

        let section = (this.protocol == 'HTTP' ? defaults.http : defaults.https)
            .replace(/%url%/g, this.url)
            .replace(/%port%/g, this.port)
            .replace(/%name%/g, this.name)
            .replace(/%ssl_cert%/, (this.protocol == 'HTTP' ? '' : this.protocol.cert_location))
            .replace(/%ssl_key%/, (this.protocol == 'HTTP' ? '' : this.protocol.key_location))

        let old_config = readFileSync(paths.nginx).toString().split('\n');
        let new_config = [];

        console.log(section);

        let in_self = false;

        for (let line of old_config) {

            if (line.indexOf(`# START ${this.name} #`) > -1) in_self = true;
            else if (line.indexOf(`# END ${this.name} #`) > -1) in_self = false;
            else if (!in_self) new_config.push(line);

        }

        new_config = new_config.concat(section.split('\n'));
        writeFileSync(paths.nginx, new_config.join('\n').replace(/(\n\n\n)/g, ''));

        try {
            execSync('sudo systemctl restart nginx');
        } catch (e) {
            throw new Error(`Unable to restart Nginx: ${e}`)
        }

    }


}

// ---

const lock = {
    locked: () => existsSync(paths.lock),
    lock: () => writeFileSync(paths.lock, ''),
    unlock: () => unlinkSync(paths.lock)
}

const start = (force = false) => {

    if (force && lock.locked()) lock.unlock();
    if (lock.locked()) throw new Error('Service already running (Lock file present)');

    // Create lockfile
    lock.lock();

    // Clear all services
    services.all().forEach(e => services.delete(e.ID));

    // Clear configs
    writeFileSync(paths.nginx, '');

    // Start Nginx
    try {
        execSync('sudo systemctl start nginx');
    } catch (e) {
        throw new Error(`Unable to start Nginx: ${e}`)
    }
}

const stop = () => {

    if (!lock.locked()) throw new Error('Service not running (Lock file missing)');

    // Clear all services
    services.all().forEach(e => services.delete(e.ID));

    // Stop Nginx
    try {
        execSync('sudo systemctl stop nginx');
    } catch (e) {
        throw new Error(`Unable to stop Nginx: ${e}`)
    }

    // Unlock
    lock.unlock();

}

const get_services = () => services.all().map(r => services.get(r.ID));

// ---

module.exports = {
    HTTPS,
    WebImplementation,
    paths,
    get_services,
    start,
    stop
}