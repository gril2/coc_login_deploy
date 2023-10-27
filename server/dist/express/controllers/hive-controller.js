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
exports.MyController = void 0;
const routing_controllers_1 = require("routing-controllers");
const sequelize_1 = require("sequelize");
const logger_1 = require("../../logger");
const redis_service_1 = require("../../services/redis-service");
const database_mongo_log_1 = require("../../database_mongo_log");
const uuid_1 = require("uuid");
const crypto = require("crypto");
const database_game_1 = require("../../database_game");
const database_code_1 = require("../../database_code");
const database_main_1 = require("../../database_main");
const moment = require("moment");
const DbIdByServerIdMap = new Map();
const mailTDataMap = new Map();
const itemTDataMap = new Map();
const ip_list = [
    '106.244.26.98',
    '112.175.60.55',
    '112.175.60.56',
    '112.175.73.153',
];
let MyController = class MyController {
    constructor() {
    }
    async HiveItemReq(body, req, response) {
        const responseObject = getResponseObject();
        console.log("HiveItemReq", body);
        if (process.env.NODE_ENV === 'production') {
            if (!this.checkWhiteList(req)) {
                responseObject.code = 50005;
                responseObject.message = 'white list ip error';
                return response.status(200).json(responseObject);
            }
        }
        try {
            const hash = crypto.createHash('sha1').update("!@#COM2US!@#" + JSON.stringify(body)).digest('hex');
            const requestHash = req.headers['apihash'];
            if (requestHash !== hash) {
                console.log("HiveItemReq", hash);
                console.log("HiveItemReq header", requestHash);
                console.log("HiveItemReq", "hash error");
                responseObject.code = 40002;
                return response.status(200).json(responseObject);
            }
            const addional = JSON.parse(body['additionalinfo']);
            if (!checkProperty(addional, ['character', 'uid', 'server', 'mail_id', 'mailType'])) {
                responseObject.code = 50005;
                responseObject.message = '!checkProperty(addional, [character, uid, server, mail_id, mailType]';
                return response.status(200).json(responseObject);
            }
            const unitGsn = addional['character'];
            console.log("character", unitGsn);
            const accountGsn = addional['uid'];
            const serverId = addional['server'];
            const mailId = addional['mail_id'];
            const recv_mailType = addional['mailType'];
            let mailType = 1;
            let mailContentType = 4;
            switch (recv_mailType) {
                case 1:
                case 31:
                    mailType = 0;
                    mailContentType = 3;
                    break;
                default:
                    mailType = 1;
                    mailContentType = 4;
                    break;
            }
            if (!mailTDataMap.has(mailId)) {
                const codeMailInfoRet = await database_code_1.sequelize.query('SELECT * FROM MailTable where TID = ?', { replacements: [mailId], type: sequelize_1.QueryTypes.SELECT });
                if (codeMailInfoRet.length == 0) {
                    responseObject.code = 50005;
                    responseObject.message = 'SELECT * FROM MailTable error ' + mailId;
                    return response.status(200).json(responseObject);
                }
                const codeMailInfo = codeMailInfoRet[0];
                mailTDataMap.set(mailId, codeMailInfo);
            }
            const now = new Date();
            const logTid = now.getTime();
            let nowstr = moment(now).format('YYYY-MM-DD HH:mm:ss');
            const mailTData = mailTDataMap.get(mailId);
            let expirestr = "1970-01-01 09:00:01";
            if (mailTData.LifeTime > 0) {
                let expireDate = new Date();
                expireDate.setSeconds(expireDate.getSeconds() + mailTData.LifeTime);
                expirestr = (moment(expireDate)).format('YYYY-MM-DD HH:mm:ss');
                console.log("expirestr = " + expirestr);
                console.log("codeMailInfo.LifeTime = " + mailTData.LifeTime);
            }
            if (!mailTDataMap.has(serverId)) {
                let mainQuery = 'SELECT db_id FROM server_info where server_id = ?;';
                const mainRet = await database_main_1.sequelize.query(mainQuery, { replacements: [serverId], type: sequelize_1.QueryTypes.SELECT });
                if (mainRet.length == 0) {
                    DbIdByServerIdMap.set(serverId, 1);
                }
                else {
                    DbIdByServerIdMap.set(serverId, mainRet[0].db_id);
                }
            }
            const dbId = DbIdByServerIdMap.get(serverId);
            const gamesequelize = database_game_1.sequelizeMap.get(dbId);
            if (!gamesequelize) {
                console.log("sequelizeMap.get(dbId)", "dbId error");
                responseObject.code = 50005;
                responseObject.code = 'DbIdByServerIdMap.get(serverId) Failed.';
                return response.status(200).json(responseObject);
            }
            const log = {
                LogTime: this.getCurrentDateTimeString(),
                LogDate: this.getCurrentDateString(),
                ServerId: body.serverId,
                ServerGroupId: body.serverId,
                UnitGsn: unitGsn,
                LogType: 176,
                TransactionId: uuid_1.v4(),
                ExecuteSQL: "SET_MAIL_SEND_NO_TRANS",
                UnitMailData: [],
                AccountMailData: [],
            };
            {
                const redisClient = redis_service_1.redisService.getClient(redis_service_1.RedisType.GSN_INFO);
                if (!redisClient) {
                    responseObject.code = 50004;
                    responseObject.message = 'redis client find fail.';
                    return response.status(200).json(responseObject);
                }
                try {
                    for (const detail of body.detail) {
                        if (!itemTDataMap.has(detail.assetCode)) {
                            let codQuery = 'SELECT ItemCategory FROM Item_InfoTable where TID = ?;';
                            const codeRet = await database_code_1.sequelize.query(codQuery, { replacements: [detail.assetCode], type: sequelize_1.QueryTypes.SELECT });
                            if (codeRet.length == 0) {
                                responseObject.code = 50005;
                                responseObject.message = 'SELECT ItemCategory FROM Item_InfoTable error ' + detail.assetCode;
                                return response.status(200).json(responseObject);
                            }
                            itemTDataMap.set(detail.assetCode, codeRet[0]);
                        }
                        if (mailContentType == 3 && itemTDataMap.get(detail.assetCode).ItemCategory == 1) {
                            responseObject.code = 50005;
                            responseObject.message = 'mailContentType == 3 &&  itemTDataMap.get(detail.assetCode).ItemCategory == 1';
                            return response.status(200).json(responseObject);
                        }
                    }
                    console.log("body.detail.length = " + body.detail.length);
                    console.log("body.detail = " + body.detail);
                    if (body.detail.length == 1) {
                        const mailGsn = await redisClient.incrAsync('GsnMail');
                        if (!mailGsn) {
                            responseObject.code = 50004;
                            responseObject.message = 'redisClient.incrAsync(GsnMail) Failed.';
                            return response.status(200).json(responseObject);
                        }
                        const query = 'CALL SET_HIVE_MAIL_SEND(?,?,?,?,?,?,?,?,?,?,?,?,?,?);';
                        const replacementValues = [unitGsn, accountGsn, serverId, mailType, mailGsn, mailId, mailContentType, body.detail[0].assetCode, body.detail[0].amount, '1970-01-01 09:00:01', 0, nowstr, expirestr, nowstr];
                        const mailQuery = query.replace(/\?/g, () => {
                            const value = replacementValues.shift();
                            return value !== undefined ? `'${value}'` : '?';
                        });
                        const mailRet = await gamesequelize.query(mailQuery, { type: sequelize_1.QueryTypes.SELECT });
                        console.log(mailRet);
                        if (mailRet[0]['0'].errorCode != 0) {
                            responseObject.code = 50004;
                            responseObject.message = 'SET_HIVE_MAIL_SEND Failed.';
                            return response.status(200).json(responseObject);
                        }
                        this.makelog(mailType, mailRet, log);
                        log.ExecuteSQL = mailQuery;
                        database_mongo_log_1.db.insertlog(log);
                    }
                    else {
                        const gameDBTran = await gamesequelize.transaction();
                        let fullQueryStr = '';
                        for (const detail of body.detail) {
                            const mailGsn = await redisClient.incrAsync('GsnMail');
                            if (!mailGsn) {
                                responseObject.code = 50004;
                                responseObject.message = 'redisClient.incrAsync(GsnMail) Failed.';
                                return response.status(200).json(responseObject);
                            }
                            const query = 'CALL SET_HIVE_MAIL_SEND_NO_TRANS(?,?,?,?,?,?,?,?,?,?,?,?,?,?);';
                            const replacementValues = [unitGsn, accountGsn, serverId, mailType, mailGsn, mailId, mailContentType, detail.assetCode, detail.amount, '1970-01-01 09:00:01', 0, nowstr, expirestr, nowstr];
                            const mailQuery = query.replace(/\?/g, () => {
                                const value = replacementValues.shift();
                                return value !== undefined ? `'${value}'` : '?';
                            });
                            fullQueryStr += mailQuery;
                            const mailRet = await gamesequelize.query(mailQuery, { type: sequelize_1.QueryTypes.SELECT });
                            console.log(mailRet);
                            if (mailRet[0]['0'].errorCode != 0) {
                                gameDBTran.rollback();
                                responseObject.code = 50004;
                                responseObject.message = 'SET_HIVE_MAIL_SEND_NO_TRANS Failed.';
                                return response.status(200).json(responseObject);
                            }
                            this.makelog(mailType, mailRet, log);
                        }
                        gameDBTran.commit();
                        log.ExecuteSQL = fullQueryStr;
                        database_mongo_log_1.db.insertlog(log);
                    }
                    const client = redis_service_1.redisService.getClient(redis_service_1.RedisType.RedisType_Optool);
                    if (client) {
                        console.log("log.UnitMailData.length", log.UnitMailData.length);
                        for (const element of log.UnitMailData) {
                            console.log("element", JSON.stringify({
                                command: "hive-mail",
                                auid: accountGsn,
                                cuid: unitGsn,
                                maildata: element
                            }));
                            client.getRedis().publish('optool-message', JSON.stringify({
                                command: "hive-mail",
                                auid: accountGsn,
                                cuid: unitGsn,
                                maildata: element
                            }));
                        }
                    }
                }
                catch (error) {
                    console.log("error", error);
                    responseObject.code = 50004;
                    responseObject.message = error.message;
                    return response.status(200).json(responseObject);
                }
            }
        }
        catch (error) {
            logger_1.logger.error('[hiveitem] ' + error.message);
            console.log('[hiveitem] ' + error.message);
            responseObject.code = 50004;
            responseObject.message = error.message;
            return response.status(200).json(responseObject);
        }
        responseObject.code = 20000;
        return response.status(200).json(responseObject);
    }
    makelog(mailType, mailRet, log) {
        if (mailType == 0) {
            const UnitMailData = {
                unit_gsn: mailRet[1]['0'].unit_gsn,
                unit_mail_gsn: mailRet[1]['0'].unit_mail_gsn,
                mail_id: mailRet[1]['0'].mail_id,
                contents_type: mailRet[1]['0'].contents_type,
                contents_gsn: mailRet[1]['0'].contents_gsn,
                contents_cnt: mailRet[1]['0'].contents_cnt,
                contents_expire_dt: mailRet[1]['0'].contents_expire_dt,
                sender_gsn: mailRet[1]['0'].sender_gsn,
                state_type: mailRet[1]['0'].state_type,
                mail_reg_dt: mailRet[1]['0'].mail_reg_dt,
                mail_expire_dt: mailRet[1]['0'].mail_expire_dt,
                mail_receive_dt: mailRet[1]['0'].mail_receive_dt,
                last_upd_dt: mailRet[1]['0'].last_upd_dt,
            };
            log.UnitMailData.push(UnitMailData);
        }
        else {
            const ServerMailData = {
                server_mail_gsn: mailRet[1]['0'].server_mail_gsn,
                mail_id: mailRet[1]['0'].mail_id,
                contents_item_id: mailRet[1]['0'].contents_item_id,
                contents_cnt: mailRet[1]['0'].contents_cnt,
                sender_gsn: mailRet[1]['0'].sender_gsn,
                state_type: mailRet[1]['0'].state_type,
                mail_reg_dt: mailRet[1]['0'].mail_reg_dt,
                mail_expire_dt: mailRet[1]['0'].mail_expire_dt,
                last_upd_dt: mailRet[1]['0'].last_upd_dt,
            };
            log.UnitMailData.push(ServerMailData);
        }
    }
    checkWhiteList(req) {
        let accept = false;
        let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        console.log('ip = ' + ip);
        for (const acceptIp of ip_list) {
            if (ip.includes(acceptIp)) {
                return true;
            }
        }
        return false;
    }
    getCurrentDateTimeString() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        const formattedMonth = month < 10 ? `0${month}` : `${month}`;
        const formattedDay = day < 10 ? `0${day}` : `${day}`;
        const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
        const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
        const formattedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
        const formattedDateTime = `${year}-${formattedMonth}-${formattedDay} ${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
        return formattedDateTime;
    }
    getCurrentDateString() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const formattedMonth = month < 10 ? `0${month}` : `${month}`;
        const formattedDay = day < 10 ? `0${day}` : `${day}`;
        const formattedDateString = `${year}-${formattedMonth}-${formattedDay}`;
        return formattedDateString;
    }
};
__decorate([
    routing_controllers_1.Post('/hiveitem'),
    __param(0, routing_controllers_1.Body()), __param(1, routing_controllers_1.Req()), __param(2, routing_controllers_1.Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], MyController.prototype, "HiveItemReq", null);
MyController = __decorate([
    routing_controllers_1.JsonController(),
    __metadata("design:paramtypes", [])
], MyController);
exports.MyController = MyController;
const getResponseObject = () => {
    return {
        code: 0,
        message: ""
    };
};
const checkProperty = (targetJson, include) => {
    for (const property of include) {
        if (!targetJson.hasOwnProperty(property)) {
            return false;
        }
    }
    return true;
};
