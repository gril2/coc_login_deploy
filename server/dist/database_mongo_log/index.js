"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mongo_sequelize = exports.db = void 0;
const logger_1 = require("../logger");
const db_info_service_1 = require("../services/db-info-service");
const mongodb_1 = require("mongodb");
class Database {
    constructor() {
        this.connectDb();
        return;
    }
    async connectDb() {
        const dbInfo = db_info_service_1.dbInfoService.getDBInfo(db_info_service_1.DBType.MONGO_DB);
        console.log(dbInfo);
        if (!dbInfo) {
            logger_1.logger.error("[DB] Error! No DBINFO");
            process.exit(44);
            return;
        }
        try {
            const mongoURL = "mongodb://" + dbInfo.username + ":" + dbInfo.password + "@" + dbInfo.host + ":" + dbInfo.port + "/?retryWrites=false";
            console.log(mongoURL);
            const options = {
                useUnifiedTopology: true
            };
            this.mongoClient = new mongodb_1.MongoClient(mongoURL, options);
            let success = false;
            await this.mongoClient.connect();
            success = true;
            this.mongoDb = this.mongoClient.db(dbInfo.db);
            console.log('Connected to MongoDB! dbName : ' + dbInfo.db);
        }
        catch (error) {
            logger_1.logger.error("[DB] Error! ", error);
            console.log('Connected to MongoDB!', error);
        }
    }
    async insertlog(log) {
        await this.mongoDb.collection('log_daily_unit').insertOne(log);
    }
    getMongoDb() {
        return this.mongoDb;
    }
}
exports.db = new Database();
exports.mongo_sequelize = exports.db.getMongoDb();
