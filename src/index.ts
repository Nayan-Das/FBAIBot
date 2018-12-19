import https from 'https';
import fs from 'fs';
import url from 'url';
import { IncomingMessage, ServerResponse } from 'http';
import { AddressInfo } from 'net';
import ip from 'ip';

const DEBUG = true;
const PORT = 8080;
const options =
{
    key: fs.readFileSync('./private/server.key'),
    cert: fs.readFileSync('./public/server.crt')
};

const cout = (...args: any[]) => {if(DEBUG)console.log(...args);};

const server = https.createServer(options, onRequest);
server.on('listening', () => cout('listening on port ' + PORT));
server.listen(PORT);

// Request handler

function onRequest(req: IncomingMessage, res: ServerResponse)
{
    const currUrl = req.url;
    if(currUrl === undefined || currUrl === '')return;

    const path = url.parse(currUrl).pathname;
    if(path === undefined)return;

    // Request for landing page

    if(path === '/')
    {
        cout('debug: request for landing page');

        res.setHeader('content-type', 'text/html');
        res.writeHead(200);
        return res.end(fs.readFileSync('./public/html/index.html'));
    }
    else if(path === '/websocketurl')
    {
        cout('debug: request for websocket url');

        res.setHeader('content-type', 'text/plain');
        res.writeHead(200);
        return res.end(ip.address());
    }

    const fullPath = './public' + path;

    cout('debug: fullPath:', fullPath);

    // Check if requested file exists

    if(!fs.existsSync(fullPath))
    {
        cout('debug: requested file doesn\'t exist');

        res.writeHead(404);
        return res.end('404 Not Found');
    }

    // Set the correct content type

    let contentType = '';
    switch(path.split('.')[1])
    {
        case 'html': contentType = 'text/html';break;
        case 'css': contentType = 'text/css';break;
        case 'js': contentType = 'application/javascript';break;
        case 'ico': contentType = 'image/x-icon';break;
        default: contentType = 'text/plain';break;
    }

    // Serve requested file

    res.setHeader('content-type', contentType);
    res.writeHead(200);
    res.end(fs.readFileSync(fullPath));
}