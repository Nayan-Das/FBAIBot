"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = __importDefault(require("https"));
const fs_1 = __importDefault(require("fs"));
const url_1 = __importDefault(require("url"));
const ip_1 = __importDefault(require("ip"));
const DEBUG = true;
const PORT = 8080;
const options = {
    key: fs_1.default.readFileSync('./private/server.key'),
    cert: fs_1.default.readFileSync('./public/server.crt')
};
const cout = (...args) => { if (DEBUG)
    console.log(...args); };
const server = https_1.default.createServer(options, onRequest);
server.on('listening', () => cout('listening on port ' + PORT));
server.listen(PORT);
// Request handler
function onRequest(req, res) {
    const currUrl = req.url;
    if (currUrl === undefined || currUrl === '')
        return;
    const path = url_1.default.parse(currUrl).pathname;
    if (path === undefined)
        return;
    // Request for landing page
    if (path === '/') {
        cout('debug: request for landing page');
        res.setHeader('content-type', 'text/html');
        res.writeHead(200);
        return res.end(fs_1.default.readFileSync('./public/html/index.html'));
    }
    else if (path === '/websocketurl') {
        cout('debug: request for websocket url');
        res.setHeader('content-type', 'text/plain');
        res.writeHead(200);
        return res.end(ip_1.default.address());
    }
    const fullPath = './public' + path;
    cout('debug: fullPath:', fullPath);
    // Check if requested file exists
    if (!fs_1.default.existsSync(fullPath)) {
        cout('debug: requested file doesn\'t exist');
        res.writeHead(404);
        return res.end('404 Not Found');
    }
    // Set the correct content type
    let contentType = '';
    switch (path.split('.')[1]) {
        case 'html':
            contentType = 'text/html';
            break;
        case 'css':
            contentType = 'text/css';
            break;
        case 'js':
            contentType = 'application/javascript';
            break;
        case 'ico':
            contentType = 'image/x-icon';
            break;
        default:
            contentType = 'text/plain';
            break;
    }
    // Serve requested file
    res.setHeader('content-type', contentType);
    res.writeHead(200);
    res.end(fs_1.default.readFileSync(fullPath));
}
//# sourceMappingURL=index.js.map