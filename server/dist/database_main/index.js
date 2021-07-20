"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sequelize = exports.models = exports.db = void 0;
const sequelize_1 = require("sequelize");
const config_1 = require("../config/config");
const logger_1 = require("../logger");
const db_info_service_1 = require("../services/db-info-service");
class Database {
    constructor() {
        const dbInfo = db_info_service_1.dbInfoService.getDBInfo(db_info_service_1.DBType.MAIN_DB);
        if (!dbInfo) {
            logger_1.logger.error("[DB] Error! No DBINFO");
            process.exit(1);
            return;
        }
        let success = false;
        const dbConfig = {
            database: dbInfo.database,
            username: dbInfo.account.id,
            password: dbInfo.account.passwd,
            host: dbInfo.host,
            port: dbInfo.port,
            dialect: config_1.databaseConfig.dialect,
            ssl: null,
            maxpool: config_1.databaseConfig.maxpool,
            minpool: config_1.databaseConfig.minpool,
            idlepool: config_1.databaseConfig.idlepool,
            logging: config_1.databaseConfig.logging,
            force: false,
            timezone: config_1.databaseConfig.timezone,
        };
        let db = this.dbConnection(dbConfig);
        db.authenticate().then(() => {
            success = true;
            this.sequelize = db;
        }).catch((error) => {
            console.log(dbConfig);
            success = true;
            logger_1.logger.error("[DB] Error! ", error);
            process.exit(1);
            return;
        });
        require('deasync').loopWhile(() => {
            return !(success === true);
        });
    }
    dbConnection(config) {
        return new sequelize_1.Sequelize(config.database, config.username, config.password, {
            host: config.host,
            port: config.port,
            dialect: config.dialect,
            dialectOptions: {
                timezone: config.timezone,
            },
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
        return this.sequelize;
    }
}
exports.db = new Database();
exports.models = exports.db.getModels();
exports.sequelize = exports.db.getSequelize();
