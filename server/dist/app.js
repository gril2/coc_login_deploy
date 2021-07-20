"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_info_service_1 = require("./services/db-info-service");
const server_1 = require("./server");
const logger_1 = require("./logger");
let start = false;
const main = async () => {
    await db_info_service_1.dbInfoService.requestDBInfo();
    start = true;
};
main();
require('deasync').loopWhile(() => {
    return !(start === true);
});
server_1.server.start();
process.on('SIGINT', () => {
    server_1.server.stop();
});
process.on('uncaughtException', function (err) {
    logger_1.logger.error(err.stack);
    console.log("Node NOT Exiting...");
});
