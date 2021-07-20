"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sequelize = exports.models = exports.db = void 0;
const sequelize_1 = require("sequelize");
const config_1 = require("../config/config");
const database_config_1 = require("../config/database-config");
const logger_1 = require("../logger");
class Database {
    constructor() {
        if (process.env.NODE_ENV == 'aws_qa') {
            this.dbConfig = config_1.databaseCodeConfig;
        }
        else if (process.env.NODE_ENV == 'aws_loadrunner') {
            this.dbConfig = database_config_1.databaseConfigLoadRunnerCode;
        }
        else if (process.env.NODE_ENV == 'production') {
            this.dbConfig = database_config_1.databaseConfigCode;
        }
        else {
            if (process.env.NODE_ENV == 'bot') {
                this.dbConfig = database_config_1.databaseConfigBotMain;
                this.dbConfig.database = 'dk_code';
            }
            else {
                this.dbConfig = config_1.databaseConfig;
                this.dbConfig.database = 'dk_code';
            }
        }
        let success = false;
        let db = this.dbConnection(this.dbConfig);
        db.authenticate().then(() => {
            success = true;
            this.sequelize = db;
        }).catch((error) => {
            console.log(this.dbConfig);
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
                max: 1,
                min: 1,
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
