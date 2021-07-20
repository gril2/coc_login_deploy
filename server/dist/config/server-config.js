"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverConfigProd = exports.serverConfigDev = void 0;
;
const apikey = 'Oyf8nDaXRgq0KiMMysxWQKeGo281RyCyzdEqDzr4UQ4=';
exports.serverConfigDev = {
    port: 21002,
    tcpPort: 21101,
    secure: false,
    dbSync: false,
    useAuth: false,
    tokenkey: '',
    useExpress: true,
    apiKey: apikey
};
exports.serverConfigProd = {
    port: 21002,
    tcpPort: 21101,
    secure: true,
    dbSync: false,
    useAuth: false,
    tokenkey: '',
    useExpress: true,
    apiKey: apikey
};
