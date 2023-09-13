"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = void 0;
const http = require("http");
require("reflect-metadata");
const routing_controllers_1 = require("routing-controllers");
const express_1 = require("./express");
const config_1 = require("./config/config");
const logger_1 = require("./logger");
const redis_service_1 = require("./services/redis-service");
const server_list_service_1 = require("./services/server-list-service");
class Server {
    constructor() {
    }
    start() {
        (0, routing_controllers_1.useExpressServer)(express_1.App.getApp(), {
            controllers: [__dirname + "/express/controllers/*{.js,.ts}"]
        });
        if (config_1.serverConfig.useExpress) {
            this.httpServer = http.createServer(express_1.App.getApp());
        }
        let port = config_1.serverConfig.port;
        redis_service_1.redisService.start();
        this.listen(port);
    }
    listen(port) {
        if (config_1.serverConfig.useExpress) {
            this.httpServer.listen(port, () => {
                logger_1.logger.info('Server listening at port: ' + port);
                console.log('Server listening at port: ' + port);
            });
        }
    }
    stop() {
        if (config_1.serverConfig.useExpress) {
            if (this.httpServer) {
                this.httpServer.close();
            }
        }
        redis_service_1.redisService.close();
        server_list_service_1.serverListService.close();
        logger_1.logger.info('Server shutdown');
        process.exit(0);
    }
}
exports.server = new Server();
