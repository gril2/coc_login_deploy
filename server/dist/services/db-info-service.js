"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbInfoService = exports.DBType = void 0;
const request = require("request-promise");
const config_1 = require("../config/config");
const logger_1 = require("../logger");
var DBType;
(function (DBType) {
    DBType[DBType["MAIN_DB"] = 0] = "MAIN_DB";
    DBType[DBType["GAME_DB"] = 1] = "GAME_DB";
    DBType[DBType["GACHA_DB"] = 2] = "GACHA_DB";
    DBType[DBType["TRADE_DB"] = 3] = "TRADE_DB";
    DBType[DBType["WORLD_DB"] = 4] = "WORLD_DB";
    DBType[DBType["LOG_DB"] = 5] = "LOG_DB";
    DBType[DBType["CASTLE_DB"] = 6] = "CASTLE_DB";
    DBType[DBType["TOOL_DB"] = 7] = "TOOL_DB";
    DBType[DBType["CODE_DB"] = 8] = "CODE_DB";
    DBType[DBType["MONGO_DB"] = 9] = "MONGO_DB";
})(DBType = exports.DBType || (exports.DBType = {}));
class DBInfoService {
    constructor() {
        this._dbInfoMap = new Map();
    }
    async requestDBInfo() {
        {
            const option = {
                headers: { 'content-type': 'application/json', 'api-key': config_1.util_server_api_key },
                url: `${config_1.getDBConfigUrl()}/db`,
                method: 'POST',
                body: JSON.stringify({
                    isGame: true
                })
            };
            console.log(option);
            try {
                const response = JSON.parse(await request(option));
                if (response.error_code == 0) {
                    for (const info of response.result) {
                        console.log(info);
                        this._dbInfoMap.set(info.type, info);
                    }
                }
            }
            catch (error) {
                logger_1.logger.error(error);
                return false;
            }
        }
        {
            const option = {
                headers: { 'content-type': 'application/json', 'api-key': config_1.util_server_api_key },
                url: `${config_1.getDBConfigUrl()}/mongo`,
                method: 'POST',
                body: JSON.stringify({
                    isGame: true
                })
            };
            console.log(option);
            try {
                const response = JSON.parse(await request(option));
                console.log(response);
                if (response.error_code == 0) {
                    console.log(response.result);
                    this._dbInfoMap.set(DBType.MONGO_DB, response.result);
                }
            }
            catch (error) {
                logger_1.logger.error(error);
                return false;
            }
        }
        return true;
    }
    getDBInfo(type) {
        return this._dbInfoMap.get(type);
    }
    test() {
    }
}
exports.dbInfoService = new DBInfoService;
