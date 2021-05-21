#!/usr/bin/env node

const { execFileSync } = require('child_process');
const { existsSync } = require('fs');
const http = require('http');
const { join } = require('path');
const { WebImplementation, get_setting, get_services } = require('./lib');

const server = http.createServer((req, res) => {

    let query = {};
    req.url.split(/\?|\&/g).slice(1).map(v => {
        query[v.split('=').shift()] = decodeURIComponent(v.split('=').pop());
    })

    let path = req.url.slice(1).split(/\/|\?/g).shift();

    if (path !== 'update') res.statusCode = 404;
    else {

        if (query['secret'] !== get_setting('secret')) res.statusCode = 400;
        else {

            let project = get_services().find(s => s.name === query['project']);
            if (!project) res.statusCode = 400;
            else {
                res.statusCode = 204;
                if(project.update_path && existsSync(project.update_path)) execFileSync(project.update_path, join(project.update_path, '../'));
            }
        }

    }
    res.end();
})

let remote_server = new WebImplementation('DeployManager', 'HTTP', 'depm.tascord.xyz', true, '/opt/DeployManager/update.sh');
remote_server.on('ready', () => server.listen(remote_server.port, () => console.log('Remote sever started @ :' + remote_server.port)));
