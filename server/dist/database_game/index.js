"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sequelizeMap = exports.models = exports.db = void 0;
const sequelize_1 = require("sequelize");
const config_1 = require("../config/config");
const logger_1 = require("../logger");
const db_info_service_1 = require("../services/db-info-service");
class Database {
    constructor() {
        this.sequelizeMap = new Map();
        const dbInfo = db_info_service_1.dbInfoService.getDBInfo(db_info_service_1.DBType.GAME_DB);
        if (!dbInfo) {
            logger_1.logger.error("[DB] Error! No DBINFO");
            process.exit(3);
            return;
        }
        let count = 0;
        for (const host of dbInfo.host) {
            let success = false;
            const dbConfig = {
                database: dbInfo.database[count],
                username: dbInfo.account.id,
                password: dbInfo.account.passwd,
                host: host[1],
                port: dbInfo.port,
                dialect: config_1.databaseConfig.dialect,
                timezone: config_1.databaseConfig.timezone,
                maxpool: config_1.databaseConfig.maxpool,
                minpool: config_1.databaseConfig.minpool,
                idlepool: config_1.databaseConfig.idlepool,
                logging: config_1.databaseConfig.logging
            };
            let db = this.dbConnection(dbConfig);
            db.sync().then(() => {
                success = true;
                this.sequelizeMap.set(dbInfo.host[count][0], db);
            }).catch((error) => {
                success = true;
                logger_1.logger.error("[DB] Error! ", error);
                logger_1.logger.error(dbConfig);
            });
            require('deasync').loopWhile(() => {
                return !(success === true);
            });
            count++;
        }
    }
    dbConnection(config) {
        return new sequelize_1.Sequelize(config.database, config.username, config.password, {
            host: config.host,
            port: config.port,
            dialect: config.dialect,
            dialectOptions: {},
            timezone: config.timezone,
            pool: {
                max: config.maxpool,
                min: config.minpool,
                idle: config.idlepool
            },
            logging: config.logging
        });
    }
    setRelation() {
    }
    getModels() {
        return this.models;
    }
    getSequelize() {
        return this.sequelizeMap;
    }
}
exports.db = new Database();
exports.models = exports.db.getModels();
exports.sequelizeMap = exports.db.getSequelize();
