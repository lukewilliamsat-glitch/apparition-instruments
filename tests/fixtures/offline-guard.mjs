// Preload for hermetic regression gates. Fixtures may replace fetch with mocks,
// but native HTTP/TLS/socket connections remain blocked in this process and
// every Node subprocess through inherited NODE_OPTIONS.
import net from 'node:net';
import tls from 'node:tls';
import http from 'node:http';
import https from 'node:https';
import {syncBuiltinESMExports} from 'node:module';
const blocked=()=>{throw Error('Outbound networking disabled in regression fixtures.');};
net.connect=net.createConnection=net.Socket.prototype.connect=blocked;
tls.connect=http.request=http.get=https.request=https.get=blocked;
globalThis.fetch=async()=>blocked();
syncBuiltinESMExports();
