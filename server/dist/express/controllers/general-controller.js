"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MyController = exports.PlatformType = void 0;
const routing_controllers_1 = require("routing-controllers");
const sequelize_1 = require("sequelize");
const error_code_1 = require("../../error-code");
const logger_1 = require("../../logger");
const database_main_1 = require("../../database_main");
const database_optool_1 = require("../../database_optool");
const database_code_1 = require("../../database_code");
const uuid_1 = require("uuid");
const server_list_service_1 = require("../../services/server-list-service");
const redis_service_1 = require("../../services/redis-service");
const auth_middleware_1 = require("../middlewares/auth-middleware");
const block_locale_service_1 = require("../../services/block-locale-service");
const date_util_1 = require("../../modules/date-util");
const redisScan = require("node-redis-scan");
const util_1 = require("util");
const database_game_1 = require("../../database_game");
var PlatformType;
(function (PlatformType) {
    PlatformType[PlatformType["KAKAO"] = 1] = "KAKAO";
    PlatformType[PlatformType["LINE"] = 2] = "LINE";
    PlatformType[PlatformType["BAND"] = 3] = "BAND";
    PlatformType[PlatformType["FACEBOOK"] = 4] = "FACEBOOK";
    PlatformType[PlatformType["GUEST"] = 5] = "GUEST";
    PlatformType[PlatformType["APPLE_GAME_CENTER"] = 6] = "APPLE_GAME_CENTER";
    PlatformType[PlatformType["GOOGLE_PLAY_GAME"] = 7] = "GOOGLE_PLAY_GAME";
    PlatformType[PlatformType["ADMIN"] = 88] = "ADMIN";
    PlatformType[PlatformType["ETC"] = 99] = "ETC";
})(PlatformType = exports.PlatformType || (exports.PlatformType = {}));
const ip_list = [
    '106.244.26.98',
];
let MyController = class MyController {
    constructor() {
    }
    async postLogin(body, req, response) {
        const responseObject = getResponseObject();
        try {
            if (!checkProperty(body, ['device_id', 'platform_type'])) {
                logger_1.logger.error(`ERROR.NO_BODY_ELEMENT : device_id`);
                responseObject.error_code = error_code_1.ERROR.NO_BODY_ELEMENT;
                return response.status(200).json(responseObject);
            }
            if (body.login_fail && body.login_fail == true) {
                console.log("body.login_fail == true");
                responseObject.error_code = error_code_1.ERROR.WHITE_LIST_ERROR;
                return response.status(200).json(responseObject);
            }
            const redisClient = redis_service_1.redisService.getClient(redis_service_1.RedisType.GAME_INFO);
            if (!redisClient) {
                responseObject.error_code = error_code_1.ERROR.REDIS_ERROR;
                return response.status(200).json(responseObject);
            }
            const checkIp = await redisClient.get('EnableWhiteList');
            const enableWhiteList = checkIp === '1';
            const passWhiteList = this.checkWhiteList(req);
            const checkServerMaintenance = await this.checkServerMaintenance();
            if (typeof checkServerMaintenance === 'object') {
                if (passWhiteList === false) {
                    responseObject.error_code = error_code_1.ERROR.SERVER_MAINTENANCE;
                    responseObject.result = {
                        maintenance_info: {
                            subject: checkServerMaintenance.title,
                            contents: checkServerMaintenance.content,
                            start_date: checkServerMaintenance.start_date,
                            end_date: checkServerMaintenance.end_date,
                        }
                    };
                    return response.status(200).json(responseObject);
                }
            }
            else {
                if (checkServerMaintenance === 0) {
                    responseObject.error_code = error_code_1.ERROR.DB_ERROR;
                    return response.status(500).json(responseObject);
                }
            }
            if (enableWhiteList && passWhiteList === false) {
                responseObject.error_code = error_code_1.ERROR.WHITE_LIST_ERROR;
                return response.status(200).json(responseObject);
            }
            const platformType = body.platform_type;
            const platformId = body.device_id;
            const uuid = uuid_1.v4();
            let mailId = body.email ? body.email : '';
            let comebackDay = 28;
            const resultCode = await database_code_1.sequelize.query(`SELECT * FROM __t_Config WHERE tid=1005`, { type: sequelize_1.QueryTypes.SELECT });
            if (resultCode.length > 0) {
                comebackDay = resultCode[0].ConfigValue;
            }
            const replacementsLogin = [platformType, platformId, uuid, mailId, comebackDay];
            const resultLogin = await database_main_1.sequelize.query(`CALL ACCOUNT_LOGIN (?,?,?,?,?)`, { replacements: replacementsLogin });
            if (resultLogin[0].errorCode) {
                responseObject.error_code = resultLogin[0].errorCode;
                if (resultLogin[0].block_id && resultLogin[0].block_id > 0) {
                    responseObject.result = {
                        platform_id: platformId,
                        block_id: resultLogin[0].block_id,
                        block_expire_dt: resultLogin[0].block_expire_dt,
                        locale_id: block_locale_service_1.blockLocaleService.getLocaleId(resultLogin[0].block_id)
                    };
                }
                return response.status(200).json(responseObject);
            }
            let account_id_no = resultLogin[0].v_account_gsn;
            let new_account = false;
            if (account_id_no === 0) {
                const replacementsJoin = [platformType, platformId, mailId];
                const resultJoin = await database_main_1.sequelize.query(`CALL SET_ACCOUNT_JOIN (?,?,?)`, { replacements: replacementsJoin });
                const resultReLogin = await database_main_1.sequelize.query(`CALL ACCOUNT_LOGIN (?,?,?,?,?)`, { replacements: replacementsLogin });
                account_id_no = resultReLogin[0].v_account_gsn;
                new_account = true;
            }
            if (account_id_no === 0) {
                logger_1.logger.error(`ERROR.NO_BODY_ELEMENT : account_id_no is 0`);
                responseObject.error_code = error_code_1.ERROR.NO_BODY_ELEMENT;
                return response.status(200).json(responseObject);
            }
            const replacementsGetInfo = [account_id_no];
            const resultGetInfo = await database_main_1.sequelize.query(`CALL GET_ACCOUNT_UNIT_INFO (?)`, { replacements: replacementsGetInfo, type: sequelize_1.QueryTypes.SELECT });
            const unitInfo = [];
            const channelIDs = new Set();
            var totalSlotCount = 0;
            const sequelize_GameDB = database_game_1.db.getSequelize();
            for (let i = 0; i < 100; i++) {
                const unit = resultGetInfo[1][i.toString()];
                if (unit) {
                    unitInfo.push(unit);
                }
                else {
                    break;
                }
            }
            const newServerList = [];
            const servers = await redisClient.hgetallAsync('NewServerList');
            if (servers) {
                for (let i = 1; i <= 20; i++) {
                    if (servers[`${i}`]) {
                        newServerList.push({ channel_id: i, is_new: Number.parseInt(servers[`${i}`]) });
                    }
                }
            }
            responseObject.result = {
                platform_type: platformType,
                platform_id: platformId,
                account_gsn: account_id_no,
                certification_key: uuid,
                account_unit_list: unitInfo,
                server_list: server_list_service_1.serverListService.getServerList(),
                new_account: new_account,
                new_server_list: newServerList,
                buy_unit_slot_cout: totalSlotCount,
            };
            const client = redis_service_1.redisService.getClient(redis_service_1.RedisType.TRADE1_INFO);
            client.getRedis().publish('t-user-login', JSON.stringify({
                channel: 0,
                gsn: account_id_no
            }));
            return response.status(200).json(responseObject);
        }
        catch (error) {
            logger_1.logger.error('[login] ' + error.message);
            responseObject.error_code = error_code_1.ERROR.DB_ERROR;
            return response.status(500).json(responseObject);
        }
    }
    async postServerList(body, response) {
        const responseObject = getResponseObject();
        try {
            if (!checkProperty(body, ['account_gsn', 'certification_key'])) {
                responseObject.error_code = error_code_1.ERROR.NO_BODY_ELEMENT;
                return response.status(200).json(responseObject);
            }
            if (body.account_gsn <= 0 || body.certification_key.length !== 36) {
                responseObject.error_code = error_code_1.ERROR.NO_BODY_ELEMENT;
                return response.status(200).json(responseObject);
            }
            const accountGSN = body.account_gsn;
            const certKey = body.certification_key;
            if (await this.checkCert(accountGSN, certKey) === false) {
                responseObject.error_code = error_code_1.ERROR.NO_BODY_ELEMENT;
                return response.status(200).json(responseObject);
            }
            responseObject.result = {
                server_list: server_list_service_1.serverListService.getServerList()
            };
            return response.status(200).json(responseObject);
        }
        catch (error) {
            logger_1.logger.error('[serverlist] ' + error.message);
            responseObject.error_code = error_code_1.ERROR.DB_ERROR;
            return response.status(500).json(responseObject);
        }
    }
    async postServerListAll(response) {
        const responseObject = getResponseObject();
        try {
            responseObject.result = {
                server_list: server_list_service_1.serverListService.getServerListAll()
            };
            return response.status(200).json(responseObject);
        }
        catch (error) {
            logger_1.logger.error('[serverlist/all] ' + error.message);
            responseObject.error_code = error_code_1.ERROR.DB_ERROR;
            return response.status(500).json(responseObject);
        }
    }
    async postLoginGame(body, req, response) {
        const responseObject = getResponseObject();
        try {
            const redisClient = redis_service_1.redisService.getClient(redis_service_1.RedisType.GAME_INFO);
            if (!redisClient) {
                responseObject.error_code = error_code_1.ERROR.REDIS_ERROR;
                return response.status(200).json(responseObject);
            }
            if (body.login_fail && body.login_fail == true) {
                console.log("body.login_fail == true /game/login");
                responseObject.error_code = error_code_1.ERROR.WHITE_LIST_ERROR;
                return response.status(200).json(responseObject);
            }
            const checkIp = await redisClient.get('EnableWhiteList');
            const checkChannelList = await redisClient.hgetallAsync('EnableWhiteListChannel');
            const enableWhiteList = checkIp === '1';
            const enableChannelWhiteList = checkChannelList ? checkChannelList[`${body.channel_id}`] === '1' : false;
            const passWhiteList = this.checkWhiteList(req);
            let passUser = false;
            if (passWhiteList) {
                passUser = true;
            }
            else {
                if (enableWhiteList === false && enableChannelWhiteList === false) {
                    passUser = true;
                }
            }
            const checkServerMaintenance = await this.checkServerMaintenance();
            if (typeof checkServerMaintenance == 'object') {
                if (passUser === false) {
                    responseObject.error_code = error_code_1.ERROR.SERVER_MAINTENANCE;
                    responseObject.result = {
                        subject: checkServerMaintenance.title,
                        contents: checkServerMaintenance.content,
                        start_date: checkServerMaintenance.start_date,
                        end_date: checkServerMaintenance.end_date
                    };
                    return response.status(200).json(responseObject);
                }
            }
            else {
                if (checkServerMaintenance === 0) {
                    responseObject.error_code = error_code_1.ERROR.DB_ERROR;
                    return response.status(500).json(responseObject);
                }
            }
            if (passUser === false) {
                responseObject.error_code = error_code_1.ERROR.WHITE_LIST_ERROR;
                return response.status(200).json(responseObject);
            }
            if (!checkProperty(body, ['channel_id', 'server_type', 'account_gsn', 'certification_key'])) {
                responseObject.error_code = error_code_1.ERROR.NO_BODY_ELEMENT;
                return response.status(200).json(responseObject);
            }
            if (body.channel_id <= 0 || body.account_gsn <= 0 || body.certification_key.length !== 36) {
                responseObject.error_code = error_code_1.ERROR.NO_BODY_ELEMENT;
                return response.status(200).json(responseObject);
            }
            const channelId = body.channel_id;
            const accountGSN = body.account_gsn;
            const certKey = body.certification_key;
            if (await this.checkCert(accountGSN, certKey) === false) {
                responseObject.error_code = error_code_1.ERROR.NO_BODY_ELEMENT;
                return response.status(200).json(responseObject);
            }
            const serverList = server_list_service_1.serverListService.getServerListWithType(channelId, body.server_type);
            if (serverList.length === 0) {
                responseObject.error_code = error_code_1.ERROR.ERROR_3499;
                return response.status(200).json(responseObject);
            }
            let waitCount = -1;
            if (await redis_service_1.redisService.existKeyInGameAccept(channelId, accountGSN) > 0) {
                if (redis_service_1.redisService.addToGameAccept(channelId, accountGSN)) {
                    if (redis_service_1.redisService.addExpireTimeToGameAccept(channelId, accountGSN)) {
                        waitCount = 0;
                    }
                }
            }
            else {
                if (redis_service_1.redisService.addToLoginWait(channelId, accountGSN)) {
                    if (redis_service_1.redisService.addExpireTimeToLoginWait(channelId, accountGSN)) {
                        if (await redis_service_1.redisService.addToLoginWaitList(channelId, accountGSN)) {
                            waitCount = await redis_service_1.redisService.getLoginWaitListRank(channelId, accountGSN);
                            if (waitCount === 0) {
                                waitCount = 1;
                            }
                        }
                    }
                }
            }
            if (waitCount === 1) {
                const client = redis_service_1.redisService.getClient(redis_service_1.RedisType.TRADE1_INFO);
                client.getRedis().publish('t-user-login', JSON.stringify({
                    channel: channelId,
                    gsn: accountGSN
                }));
            }
            let hostName = serverList[0].external_host_name;
            let ip = req.headers['x-real-ip'] || req.connection.remoteAddress;
            const includes = ip.includes('127.0.0.1') || ip.includes('192.168.0.');
            const env = process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'aws_qa' && process.env.NODE_ENV !== 'bot';
            if (channelId === 1 && includes && env) {
                hostName = '192.168.0.216';
            }
            responseObject.result = {
                channel_id: channelId,
                external_host_name: hostName,
                external_port: serverList[0].external_port_list[0],
                wait_number: waitCount
            };
            return response.status(200).json(responseObject);
        }
        catch (error) {
            logger_1.logger.error('[game/login] ' + error.message);
            responseObject.error_code = error_code_1.ERROR.DB_ERROR;
            return response.status(500).json(responseObject);
        }
    }
    async getRecommended(body, req, response) {
        const responseObject = getResponseObject();
        try {
            const redisClient = redis_service_1.redisService.getClient(redis_service_1.RedisType.GAME_INFO);
            if (!redisClient) {
                responseObject.error_code = error_code_1.ERROR.REDIS_ERROR;
                return response.status(200).json(responseObject);
            }
            responseObject.result = {
                recommended_server_list: [],
                new_server_list: [],
                server_list: server_list_service_1.serverListService.getServerList(),
                wait_count_list: []
            };
            let servers = await redisClient.hgetallAsync('RecommendedServerList');
            if (servers) {
                for (let i = 1; i <= 20; i++) {
                    if (servers[`${i}`]) {
                        responseObject.result.recommended_server_list.push({ channel_id: i, recommended: Number.parseInt(servers[`${i}`]) });
                    }
                }
            }
            servers = await redisClient.hgetallAsync('NewServerList');
            if (servers) {
                for (let i = 1; i <= 20; i++) {
                    if (servers[`${i}`]) {
                        responseObject.result.new_server_list.push({ channel_id: i, recommended: Number.parseInt(servers[`${i}`]) });
                    }
                }
            }
            const redis = redis_service_1.redisService.getClient(redis_service_1.RedisType.LOGIN_WAIT1_INFO);
            const scanner = new redisScan(redis.getRedis());
            const scanAsync = util_1.promisify(scanner.scan).bind(scanner);
            const keyCount = new Map();
            let matchingKeys = await scanAsync('loginwait:*', { count: 100000 });
            for (const key of matchingKeys) {
                const data = key.split(':');
                if (data.length > 1) {
                    const channel = data[1];
                    if (keyCount.has(channel)) {
                        let value = keyCount.get(channel);
                        keyCount.set(channel, value + 1);
                    }
                    else {
                        keyCount.set(channel, 1);
                    }
                }
            }
            for (const [key, value] of keyCount.entries()) {
                responseObject.result.wait_count_list.push({
                    channel_id: Number.parseInt(key),
                    count: value
                });
            }
            return response.status(200).json(responseObject);
        }
        catch (error) {
            logger_1.logger.error('[recommended] ' + error.message);
            responseObject.error_code = error_code_1.ERROR.DB_ERROR;
            return response.status(500).json(responseObject);
        }
    }
    async postWhiteListEnable(body, response) {
        const responseObject = getResponseObject();
        try {
            if (!checkProperty(body, ['enable'])) {
                responseObject.error_code = error_code_1.ERROR.NO_BODY_ELEMENT;
                return response.status(200).json(responseObject);
            }
            const redisClient = redis_service_1.redisService.getClient(redis_service_1.RedisType.GAME_INFO);
            if (!redisClient) {
                responseObject.error_code = error_code_1.ERROR.REDIS_ERROR;
                return response.status(200).json(responseObject);
            }
            redisClient.getRedis().set('EnableWhiteList', body.enable);
            return response.status(200).json(responseObject);
        }
        catch (error) {
            logger_1.logger.error('[serverlist] ' + error.message);
            responseObject.error_code = error_code_1.ERROR.DB_ERROR;
            return response.status(500).json(responseObject);
        }
    }
    async postWhiteListChannelEnable(body, response) {
        const responseObject = getResponseObject();
        try {
            if (!checkProperty(body, ['enable'])) {
                responseObject.error_code = error_code_1.ERROR.NO_BODY_ELEMENT;
                return response.status(200).json(responseObject);
            }
            const redisClient = redis_service_1.redisService.getClient(redis_service_1.RedisType.GAME_INFO);
            if (!redisClient) {
                responseObject.error_code = error_code_1.ERROR.REDIS_ERROR;
                return response.status(200).json(responseObject);
            }
            redisClient.getRedis().hset('EnableWhiteListChannel', body.channel, body.enable);
            return response.status(200).json(responseObject);
        }
        catch (error) {
            logger_1.logger.error('[serverlist] ' + error.message);
            responseObject.error_code = error_code_1.ERROR.DB_ERROR;
            return response.status(500).json(responseObject);
        }
    }
    async checkCert(gsn, cert) {
        const replacementsCert = [gsn, cert];
        const resultCert = await database_main_1.sequelize.query(`CALL CHECK_CERTIFICATION_KEY (?,?)`, { replacements: replacementsCert });
        return (resultCert[0].v_ExistsCheck > 0);
    }
    async checkServerMaintenance() {
        try {
            const dateString = date_util_1.getDateString(new Date());
            const query = `SELECT * FROM check_popup WHERE del_yn='N' AND start_date <= '${dateString}' AND end_date > '${dateString}'`;
            const datas = await database_optool_1.sequelize.query(query, { type: sequelize_1.QueryTypes.SELECT });
            for (const data of datas) {
                return data;
            }
            return 1;
        }
        catch (error) {
            logger_1.logger.error('[checkServerMaintenance] ' + error.message);
            return 0;
        }
    }
    checkWhiteList(req) {
        let accept = false;
        let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        for (const acceptIp of ip_list) {
            if (ip.includes(acceptIp)) {
                return true;
            }
        }
        return false;
    }
};
__decorate([
    routing_controllers_1.Post('/login'),
    __param(0, routing_controllers_1.Body()), __param(1, routing_controllers_1.Req()), __param(2, routing_controllers_1.Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], MyController.prototype, "postLogin", null);
__decorate([
    routing_controllers_1.Post('/serverlist'),
    __param(0, routing_controllers_1.Body()), __param(1, routing_controllers_1.Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MyController.prototype, "postServerList", null);
__decorate([
    routing_controllers_1.Get('/serverlist'),
    __param(0, routing_controllers_1.Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MyController.prototype, "postServerListAll", null);
__decorate([
    routing_controllers_1.Post('/game/login'),
    __param(0, routing_controllers_1.Body()), __param(1, routing_controllers_1.Req()), __param(2, routing_controllers_1.Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], MyController.prototype, "postLoginGame", null);
__decorate([
    routing_controllers_1.Get('/recommend'),
    __param(0, routing_controllers_1.Body()), __param(1, routing_controllers_1.Req()), __param(2, routing_controllers_1.Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], MyController.prototype, "getRecommended", null);
__decorate([
    routing_controllers_1.Post('/whitelist/enable'),
    __param(0, routing_controllers_1.Body()), __param(1, routing_controllers_1.Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MyController.prototype, "postWhiteListEnable", null);
__decorate([
    routing_controllers_1.Post('/whitelist/channel/enable'),
    __param(0, routing_controllers_1.Body()), __param(1, routing_controllers_1.Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MyController.prototype, "postWhiteListChannelEnable", null);
MyController = __decorate([
    routing_controllers_1.JsonController(),
    routing_controllers_1.UseBefore(auth_middleware_1.authKeyMiddleware),
    __metadata("design:paramtypes", [])
], MyController);
exports.MyController = MyController;
const checkProperty = (targetJson, include) => {
    for (const property of include) {
        if (!targetJson.hasOwnProperty(property)) {
            return false;
        }
    }
    return true;
};
const getResponseObject = () => {
    return {
        error_code: 0,
        result: null
    };
};
