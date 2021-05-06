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
    lock: join(__dirname, '../', 'files', 'dm.lck')
}

// ---

class WebImplementation extends require('events').EventEmitter {

    /**
     * Setup a new web application
     * @param {String} name Applications name
     * @param {'HTTP'|'HTTPS'} protocol Public URL protocol
     * @param {String} url Applications public URL
     * @param {String} path Application path
     */
    constructor(name, protocol, url, path = '/') {

        super();

        if (!lock.locked()) start();

        this.name = name;
        this.protocol = protocol;
        this.url = url;
        this.path = path;

        if (!this.name) throw new Error('Invalid web application name');
        if (this.protocol != 'HTTP' && this.protocol != 'HTTPS') throw new Error('Invalid protocol.');
        // if(this.url ? /^([a-z0-9].)+$/.test(this.url) : false) throw new Error('Invalid web URL');
        if (!this.path) throw new Error('Invalid path');
        if (services.has(name)) throw new Error('A service by that name is already registered');

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

        let section =
            `# START ${this.name} #` + `\n\n` +
            `server {` + `\n\n\t` +
            `listen 80;` + `\n\t` +
            `server_name www.${this.url} ${this.url};` + `\n\n\t` +
            `location ${this.path} {` + `\n\t\t` +
            `proxy_pass http://127.0.0.1:${this.port};` + `\n\t` +
            `}` + `\n\n` +
            `}` + `\n\n` +
            `# END ${this.name} #` + '\n';


        let old_config = readFileSync(paths.nginx).toString().split('\n');
        let new_config = [];

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
    WebImplementation,
    paths,
    get_services,
    start,
    stop
}