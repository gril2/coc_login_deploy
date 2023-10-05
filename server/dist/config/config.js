"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDBConfigUrl = exports.api_url_ext = exports.api_url_qa = exports.api_url_bot = exports.api_url_prod = exports.api_url_dev = exports.util_server_api_key = exports.redisConfig = exports.loggerConfig = exports.databaseCodeConfig = exports.databaseMainConfig = exports.databaseConfig = exports.serverConfig = void 0;
const database_config_1 = require("./database-config");
const logging_config_1 = require("./logging-config");
const server_config_1 = require("./server-config");
const redis_config_1 = require("./redis-config");
exports.serverConfig = process.env.NODE_ENV === 'production' ? server_config_1.serverConfigProd : server_config_1.serverConfigDev;
exports.databaseConfig = process.env.NODE_ENV === 'production' ? database_config_1.databaseConfigProd : database_config_1.databaseConfigDev;
exports.databaseMainConfig = database_config_1.databaseConfigQAMain;
exports.databaseCodeConfig = database_config_1.databaseConfigQACode;
exports.loggerConfig = logging_config_1.loggingConfig;
exports.redisConfig = process.env.NODE_ENV === 'production' ? redis_config_1.redisConfigProd : (process.env.NODE_ENV === 'aws_loadrunner' ? redis_config_1.redisConfigStress : redis_config_1.redisConfigDev);
exports.util_server_api_key = 'PjrHQj6pVDXb5s1I4kpXJ/uxUG3a7ORLeH+YT61ZIYs=';
exports.api_url_dev = 'http://192.168.0.231:13010/config';
exports.api_url_prod = 'http://10.0.1.88:13010/config';
exports.api_url_bot = 'http://192.168.0.231:13010/config';
exports.api_url_qa = 'http://192.168.0.151:13010/config';
exports.api_url_ext = 'http://192.168.0.91:13010/config';
const getDBConfigUrl = () => {
    if (process.env.NODE_ENV === 'aws_qa') {
        return exports.api_url_qa;
    }
    else if (process.env.NODE_ENV === 'bot') {
        return exports.api_url_bot;
    }
    else if (process.env.NODE_ENV === 'ext') {
        return exports.api_url_ext;
    }
    else {
        if (process.env.NODE_ENV === 'production') {
            return exports.api_url_prod;
        }
        else {
            return exports.api_url_dev;
        }
    }
};
exports.getDBConfigUrl = getDBConfigUrl;
