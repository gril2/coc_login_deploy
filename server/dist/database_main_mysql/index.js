"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const logger_1 = require("../logger");
const db_info_service_1 = require("../services/db-info-service");
const mysql = require('mysql2/promise');
class Database {
    constructor() {
        this.mysqlConSuccess = false;
        console.log("My SQL Database constructor");
        console.log("My SQL Database constructor");
        console.log("My SQL Database constructor");
        console.log("My SQL Database constructor");
        const dbInfo = db_info_service_1.dbInfoService.getDBInfo(db_info_service_1.DBType.MAIN_DB);
        if (!dbInfo) {
            logger_1.logger.error("[DB] Error! No DBINFO");
            process.exit(4);
            return;
        }
        this.mysqlPool = mysql.createPool({
            host: dbInfo.host,
            port: dbInfo.port,
            user: dbInfo.web_account.id,
            password: dbInfo.web_account.passwd,
            database: dbInfo.database,
            connectionLimit: 20
        });
        this.ConMySql(dbInfo);
        require('deasync').loopWhile(() => {
            return !(this.mysqlConSuccess === true);
        });
        let success = false;
    }
    async ConMySql(config) {
        try {
            this.mysqlCon = await this.mysqlConnection();
            this.mysqlConSuccess = true;
        }
        catch (error) {
            console.log(error);
            this.mysqlConSuccess = false;
        }
    }
    async mysqlConnection() {
        return await this.mysqlPool.getConnection(async (conn) => conn);
    }
    setRelation() {
    }
    async getMysqlconnection() {
        return await this.mysqlConnection();
    }
}
exports.db = new Database();
