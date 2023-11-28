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
const database_optool_1 = require("../../database_optool");
const uuid_1 = require("uuid");
const server_list_service_1 = require("../../services/server-list-service");
const redis_service_1 = require("../../services/redis-service");
const auth_middleware_1 = require("../middlewares/auth-middleware");
const block_locale_service_1 = require("../../services/block-locale-service");
const date_util_1 = require("../../modules/date-util");
const redisScan = require("node-redis-scan");
const util_1 = require("util");
const crypto = require("crypto");
const moment = require("moment");
const request = require("request-promise");
const database_main_mysql_1 = require("../../database_main_mysql");
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
    "106.244.26.98",
    "10.0.1.127",
    "10.0.1.213",
    "54.180.56.180",
    "43.200.113.8",
    "54.180.187.192"
];
const certKeyLength = 36;
const clientSecret = "GL7hFO7guB";
const BLOCK_SIZE = 16;
const AES_INITVECTOR = "6C2Syq8tbK3eApue";
function getKeyBytes(clientSecret, size) {
    const digest = crypto.createHash('sha1');
    digest.update(clientSecret);
    const hash = digest.digest();
    return hash.slice(0, size);
}
function encryptValue(plain, clientSecret) {
    const encKey = getKeyBytes(clientSecret, BLOCK_SIZE);
    const iv = Buffer.from(AES_INITVECTOR, 'utf8');
    const cipher = crypto.createCipheriv('aes-128-cbc', encKey, iv);
    let encrypted = cipher.update(plain, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
}
function decryptValue(encData, clientSecret) {
    const decKey = getKeyBytes(clientSecret, BLOCK_SIZE);
    const iv = Buffer.from(AES_INITVECTOR, 'utf8');
    const decipher = crypto.createDecipheriv('aes-128-cbc', decKey, iv);
    let decrypted = decipher.update(encData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
let MyController = class MyController {
    constructor() { }
    async postLoginThirdPartySign(body, req, response) {
        const responseObject = getResponseObject();
        try {
            if (!checkProperty(body, ["device_id"])) {
                logger_1.logger.error(`ERROR.NO_BODY_ELEMENT : device_id`);
                responseObject.error_code = error_code_1.ERROR.NO_BODY_ELEMENT;
                return response.status(200).json(responseObject);
            }
            const redisClient = redis_service_1.redisService.getClient(redis_service_1.RedisType.GAME_INFO);
            if (!redisClient) {
                responseObject.error_code = error_code_1.ERROR.REDIS_ERROR;
                return response.status(200).json(responseObject);
            }
            const checkIp = await redisClient.get("EnableWhiteList");
            const enableWhiteList = checkIp === "1";
            const passWhiteList = this.checkWhiteList(req);
            if (enableWhiteList && passWhiteList === false) {
                responseObject.error_code = error_code_1.ERROR.WHITE_LIST_ERROR;
                return response.status(200).json(responseObject);
            }
            const platformType = body.platform_type;
            const platformId = body.platform_id;
            let uuid = uuid_1.v4();
            let comebackDay = 28;
            const replacementsLogin = [platformId, uuid, comebackDay, date_util_1.getDateString(new Date())];
            const sqlCon = await database_main_mysql_1.db.getMysqlconnection();
            const [resultLogin, fields] = await sqlCon.query(`CALL SET_ACCOUNT_LOGIN (?,?,?,?)`, replacementsLogin);
            sqlCon.release();
            if (resultLogin[0][0].errorCode) {
                responseObject.error_code = resultLogin[0][0].errorCode;
                if (resultLogin[0][0].block_id && resultLogin[0][0].block_id > 0) {
                    responseObject.result = {
                        platform_id: platformId,
                        block_id: resultLogin[0][0].block_id,
                        block_expire_dt: resultLogin[0].block_expire_dt,
                        locale_id: block_locale_service_1.blockLocaleService.getLocaleId(resultLogin[0][0].block_id),
                    };
                }
                return response.status(200).json(responseObject);
            }
            let auid = resultLogin[0].v_account_gsn;
            const authDt = new Date(resultLogin[0].v_thirdPartyAuthDt);
            let new_account = false;
            let need_third_party_sign = false;
            let isNewAccount = false;
            if (auid === 0) {
                new_account = true;
                need_third_party_sign = true;
            }
            else {
                let expireDate = new Date('1970-12-31');
                const resultCode = await database_optool_1.sequelize.query(`SELECT * FROM authentication`, { type: sequelize_1.QueryTypes.SELECT });
                if (resultCode.length > 0) {
                    expireDate = resultCode[0].last_upd_dt;
                    console.log("expireDate : " + expireDate);
                }
                if (authDt < expireDate) {
                    need_third_party_sign = true;
                }
            }
            console.log('passWhiteList = ' + passWhiteList);
            console.log('need_third_party_sign = ' + need_third_party_sign);
            if (passWhiteList && need_third_party_sign) {
                console.log("white list kakao auth");
                const ci = 'white:third_party_ci:' + body.device_id;
                const tx_id = 'white:third_party_ci:' + body.device_id;
                const now = new Date();
                let nowstr = moment(now).format('YYYY-MM-DD HH:mm:ss');
                if (auid == 0) {
                    const countryCode = body.country_code;
                    const replacementsJoin = [platformId, 0, countryCode, ci, tx_id, nowstr, date_util_1.getDateString(new Date())];
                    const sqlCon = await database_main_mysql_1.db.getMysqlconnection();
                    const [resultJoin, fields2] = await sqlCon.query(`CALL SET_ACCOUNT_JOIN (?,?,?,?,?,?,?)`, replacementsJoin);
                    sqlCon.release();
                    if (resultJoin[0][0].errorCode != 0) {
                        responseObject.error_code = resultJoin[0][0].errorCode;
                        return response.status(200).json(responseObject);
                    }
                    const sqlCon2 = await database_main_mysql_1.db.getMysqlconnection();
                    const [resultReLogin, fields] = await sqlCon2.query(`CALL SET_ACCOUNT_LOGIN (?,?,?,?)`, replacementsLogin);
                    sqlCon2.release();
                    if (resultReLogin[0][0].errorCode != 0) {
                        responseObject.error_code = resultReLogin[0][0].errorCode;
                        return response.status(200).json(responseObject);
                    }
                    auid = resultReLogin[1][0].v_account_gsn;
                    if (auid === 0) {
                        logger_1.logger.error(`ERROR.NO_BODY_ELEMENT : v_account_gsn is 0`);
                        responseObject.error_code = error_code_1.ERROR.NO_BODY_ELEMENT;
                        return response.status(200).json(responseObject);
                    }
                    isNewAccount = true;
                }
                else {
                    const sqlCon2 = await database_main_mysql_1.db.getMysqlconnection();
                    const replacementsThird = [auid, ci, tx_id, nowstr];
                    const [resultkakaoJoin, fields] = await sqlCon2.query(`CALL SET_ACCOUNT_LOGIN (?,?,?,?)`, replacementsThird);
                    sqlCon2.release();
                    if (resultkakaoJoin) {
                        console.log("kakao auth err : " + resultkakaoJoin[0].errorCode);
                        responseObject.error_code = resultkakaoJoin[0].errorCode;
                        return response.status(200).json(responseObject);
                    }
                }
                need_third_party_sign = false;
            }
            const unitInfo = [];
            const charInfos = [];
            if (auid != 0 && !need_third_party_sign) {
                const replacementsGetInfo = [auid];
                const sqlCon3 = await database_main_mysql_1.db.getMysqlconnection();
                const [resultGetInfo] = await sqlCon3.query(`CALL GET_ACCOUNT_UNIT_INFO (?)`, replacementsGetInfo);
                sqlCon3.release();
                if (resultGetInfo[0][0].errorCode != 0) {
                    responseObject.error_code = resultGetInfo[0][0].errorCode;
                    return response.status(200).json(responseObject);
                }
                const maxUnitCount = Object.keys(resultGetInfo[2]).length;
                for (let i = 0; i < maxUnitCount; i++) {
                    const unit = resultGetInfo[2][i.toString()];
                    if (unit) {
                        charInfos.push(unit);
                    }
                    else {
                        break;
                    }
                }
                const client = redis_service_1.redisService.getClient(redis_service_1.RedisType.TRADE1_INFO);
                client.getRedis().publish("t-user-login", JSON.stringify({
                    channel: 0,
                    gsn: auid,
                }));
            }
            const newServerList = [];
            const servers = await redisClient.hgetallAsync("NewServerList");
            if (servers) {
                for (let i = 1; i <= 20; i++) {
                    if (servers[`${i}`]) {
                        newServerList.push({ channel_id: i, is_new: Number.parseInt(servers[`${i}`]) });
                    }
                }
            }
            if (need_third_party_sign) {
                uuid = "";
            }
            responseObject.result = {
                platform_type: platformType,
                platform_id: platformId,
                auid: auid,
                cert_key: uuid,
                account_char_list: charInfos,
                server_list: server_list_service_1.serverListService.GetPublicServerList(),
                is_new_account: isNewAccount,
                new_server_list: newServerList,
            };
            const client = redis_service_1.redisService.getClient(redis_service_1.RedisType.TRADE1_INFO);
            client.getRedis().publish("notify_login", JSON.stringify({
                auid: auid,
            }));
        }
        catch (error) {
            logger_1.logger.error("[login] " + error.message);
            responseObject.error_code = error_code_1.ERROR.DB_ERROR;
            return response.status(500).json(responseObject);
        }
    }
    async postNaverSign(body, response) {
        console.log("naver-sign : " + body);
        console.log(body.name);
        console.log(body.phone);
        console.log(body.birthday);
        const responseObject = getResponseObject();
        const nameBase64 = encryptValue(body.name, clientSecret);
        const phoneBase64 = encryptValue(body.phone, clientSecret);
        const birthdayBase64 = encryptValue(body.birthday, clientSecret);
        console.log(decryptValue(nameBase64, clientSecret));
        console.log(decryptValue(phoneBase64, clientSecret));
        console.log(decryptValue(birthdayBase64, clientSecret));
        const nonce = crypto.randomBytes(16).toString('hex');
        const timestamp = Date.now();
        const hmac = crypto.createHmac('sha256', clientSecret);
        hmac.update(nonce + '-' + timestamp);
        const signature = hmac.digest('base64');
        const option = {
            headers: { 'Content-Type': 'application/json',
                'X-Naver-Client-Id': 'wxtboovZrJsn27hMQzQb',
                'X-Naver-Nonce': nonce,
                'X-Naver-Timestamp': timestamp,
                'X-Naver-Signature': signature
            },
            url: `https://nsign-gw.naver.com/sign/v3/ekyc/plugin`,
            method: 'POST',
            body: JSON.stringify({
                enc_version: 1,
                mobile: phoneBase64,
                realName: nameBase64,
                birthday: birthdayBase64,
                templateCode: 'selfAuth_v1',
                deviceBrowser: 'NA',
                deviceCode: "MO",
                mobileOs: "ANDROID",
                callbackSchemeUrl: body.callbackSchemeUrl
            })
        };
        try {
            console.log(option.headers);
            console.log(option.body);
            const prePareRes = JSON.parse(await request(option));
            console.log(prePareRes);
            if (prePareRes.rtnMsg != 'success') {
                responseObject.error_code = error_code_1.ERROR.NAVER_SIGN_API_CALL_ERROR;
                responseObject.error_msg = prePareRes.rtnMsg;
                return response.status(500).json(responseObject);
            }
            responseObject.error_code = error_code_1.ERROR.NO_ERROR;
            responseObject.result = {
                txId: prePareRes.txId,
                naverAppSchemeUrl: prePareRes.naverAppSchemeUrl,
            };
            console.log(responseObject);
            return response.status(200).json(responseObject);
        }
        catch (error) {
            logger_1.logger.error(error);
            console.log("error : " + JSON.stringify(error.error));
            const errJson = JSON.stringify(error.error);
            responseObject.error_code = error.statusCode;
            responseObject.error_msg = errJson;
            console.log(responseObject);
            return response.status(500).json(responseObject);
        }
    }
    async GetAccountGsn(platformId) {
        const uuid = uuid_1.v4();
        let comebackDay = 28;
        const replacementsLogin = [platformId, uuid, comebackDay, date_util_1.getDateString(new Date())];
        const sqlCon = await database_main_mysql_1.db.getMysqlconnection();
        const [resultLogin, fields] = await sqlCon.query(`CALL SET_ACCOUNT_LOGIN (?,?,?,?)`, replacementsLogin);
        sqlCon.release();
        if (resultLogin[0][0].errorCode) {
            return -1;
        }
        return resultLogin[1][0].v_account_gsn;
    }
    async postNaverSignResult(body, response) {
        console.log("naver-sign-result : " + body);
        const responseObject = getResponseObject();
        const nonce = crypto.randomBytes(16).toString('hex');
        const timestamp = Date.now();
        const hmac = crypto.createHmac('sha256', clientSecret);
        hmac.update(nonce + '-' + timestamp);
        const signature = hmac.digest('base64');
        const option = {
            headers: { 'Content-Type': 'application/json',
                'X-Naver-Client-Id': 'wxtboovZrJsn27hMQzQb',
                'X-Naver-Nonce': nonce,
                'X-Naver-Timestamp': timestamp,
                'X-Naver-Signature': signature
            },
            url: `https://nsign-gw.naver.com/sign/v3/ekyc/plugin/result?txId=` + body.txId,
            method: 'GET',
        };
        try {
            console.log(option);
            const verifyRes = JSON.parse(await request(option));
            console.log(verifyRes);
            let sign_result = false;
            if (verifyRes.authResult == 'success') {
                const ci = verifyRes.profile.ci;
                const now = new Date();
                let nowstr = moment(now).format('YYYY-MM-DD HH:mm:ss');
                let accountGsn = await this.GetAccountGsn(body.device_id);
                if (accountGsn == 0) {
                    const countryCode = body.country_code;
                    const replacementsJoin = [body.device_id, 0, countryCode, ci, body.txId, nowstr, date_util_1.getDateString(new Date())];
                    const sqlCon = await database_main_mysql_1.db.getMysqlconnection();
                    const [resultJoin, fields2] = await sqlCon.query(`CALL SET_ACCOUNT_JOIN (?,?,?,?,?,?,?)`, replacementsJoin);
                    sqlCon.release();
                    if (resultJoin[0][0].errorCode != 0) {
                        responseObject.error_code = resultJoin[0][0].errorCode;
                        return response.status(500).json(responseObject);
                    }
                }
                else if (accountGsn > 0) {
                    const replacementsJoin = [accountGsn, ci, body.txId, nowstr, nowstr];
                    const sqlCon = await database_main_mysql_1.db.getMysqlconnection();
                    const [resultkakaoJoin, fields2] = await sqlCon.query(`CALL SET_THIRD_PARTY_AUTH (?,?,?,?)`, { replacements: replacementsJoin });
                    sqlCon.release();
                    if (resultkakaoJoin[0][0].errorCode != 0) {
                        console.log("query : CALL SET_THIRD_PARTY_AUTH " + accountGsn + ", " + ci + ", " + body.txId + ", " + nowstr);
                        console.log("kakao auth err : " + resultkakaoJoin[0].errorCode);
                        responseObject.error_code = resultkakaoJoin[0].errorCode;
                        return response.status(500).json(responseObject);
                    }
                }
                sign_result = true;
            }
            else {
                responseObject.error_code = error_code_1.ERROR.NAVER_SIGN_RESULT_NOT_SIGNED_ERROR;
                return response.status(500).json(responseObject);
            }
            responseObject.result = {
                sign_result: sign_result
            };
            responseObject.error_code = error_code_1.ERROR.NO_ERROR;
            return response.status(200).json(responseObject);
        }
        catch (error) {
            logger_1.logger.error(error);
            console.log("error : " + JSON.stringify(error.error));
            const errJson = JSON.stringify(error.error);
            responseObject.error_code = error.statusCode;
            responseObject.error_msg = errJson;
            return response.status(500).json(responseObject);
        }
    }
    async LoginAccountController(body, req, response) {
        const responseObject = getResponseObject();
        try {
            if (!checkProperty(body, ["platform_id", "platform_type", "email", "market_type", "country_code"])) {
                logger_1.logger.error(`ERROR.NO_BODY_ELEMENT : platform_id`);
                responseObject.error_code = error_code_1.ERROR.NO_BODY_ELEMENT;
                return response.status(200).json(responseObject);
            }
            console.log(1);
            if (body.login_fail && body.login_fail == true) {
                console.log("body.login_fail == true");
                responseObject.error_code = error_code_1.ERROR.WHITE_LIST_ERROR;
                return response.status(200).json(responseObject);
            }
            const redisClient = redis_service_1.redisService.getClient(redis_service_1.RedisType.RedisType_Optool);
            if (!redisClient) {
                responseObject.error_code = error_code_1.ERROR.REDIS_ERROR;
                return response.status(200).json(responseObject);
            }
            const checkIp = await redisClient.get("EnableWhiteList");
            const enableWhiteList = checkIp === "1";
            const passWhiteList = this.checkWhiteList(req);
            console.log(2);
            if (enableWhiteList && passWhiteList === false) {
                responseObject.error_code = error_code_1.ERROR.WHITE_LIST_ERROR;
                return response.status(200).json(responseObject);
            }
            let comebackDay = 28;
            console.log(3);
            const platformType = body.platform_type;
            const platformId = body.platform_id;
            const mailId = body.email;
            const marketType = body.market_type;
            const uuid = uuid_1.v4();
            const replacementsLogin = [platformId, uuid, comebackDay, date_util_1.getDateString(new Date())];
            const sqlCon = await database_main_mysql_1.db.getMysqlconnection();
            const [resultLogin, fields] = await sqlCon.query(`CALL SET_ACCOUNT_LOGIN (?,?,?,?)`, replacementsLogin);
            sqlCon.release();
            if (resultLogin[0][0].errorCode) {
                responseObject.error_code = resultLogin[0][0].errorCode;
                if (resultLogin[0][0].block_id && resultLogin[0][0].block_id > 0) {
                    responseObject.result = {
                        platform_id: platformId,
                        block_id: resultLogin[0][0].block_id,
                        block_expire_dt: resultLogin[0].block_expire_dt,
                        locale_id: block_locale_service_1.blockLocaleService.getLocaleId(resultLogin[0][0].block_id),
                    };
                }
                return response.status(200).json(responseObject);
            }
            let auid = resultLogin[1][0].v_account_gsn;
            let isNewAccount = false;
            if (auid === 0) {
                const countryCode = body.country_code;
                const ci = 'white:third_party_ci:' + platformId;
                const tx_id = 'white:third_party_ci:' + platformId;
                const replacementsJoin = [platformId, 0, countryCode, ci, tx_id, date_util_1.getDateString(new Date()), date_util_1.getDateString(new Date())];
                console.log(replacementsJoin);
                const sqlCon = await database_main_mysql_1.db.getMysqlconnection();
                const [resultJoin, fields2] = await sqlCon.query(`CALL SET_ACCOUNT_JOIN (?,?,?,?,?,?,?)`, replacementsJoin);
                console.log(resultJoin);
                sqlCon.release();
                if (resultJoin[0][0].errorCode != 0) {
                    responseObject.error_code = resultJoin[0][0].errorCode;
                    return response.status(200).json(responseObject);
                }
                const sqlCon2 = await database_main_mysql_1.db.getMysqlconnection();
                const [resultReLogin, fields] = await sqlCon2.query(`CALL SET_ACCOUNT_LOGIN (?,?,?,?)`, replacementsLogin);
                sqlCon2.release();
                if (resultReLogin[0][0].errorCode != 0) {
                    responseObject.error_code = resultReLogin[0][0].errorCode;
                    return response.status(200).json(responseObject);
                }
                auid = resultReLogin[1][0].v_account_gsn;
                if (auid === 0) {
                    logger_1.logger.error(`ERROR.NO_BODY_ELEMENT : v_account_gsn is 0`);
                    responseObject.error_code = error_code_1.ERROR.NO_BODY_ELEMENT;
                    return response.status(200).json(responseObject);
                }
                isNewAccount = true;
            }
            console.log(4);
            const replacementsGetInfo = [auid];
            const sqlCon3 = await database_main_mysql_1.db.getMysqlconnection();
            const [resultGetInfo] = await sqlCon3.query(`CALL GET_ACCOUNT_UNIT_INFO (?)`, replacementsGetInfo);
            sqlCon3.release();
            if (resultGetInfo[0][0].errorCode != 0) {
                responseObject.error_code = resultGetInfo[0][0].errorCode;
                return response.status(200).json(responseObject);
            }
            const charInfos = [];
            const maxUnitCount = Object.keys(resultGetInfo[2]).length;
            for (let i = 0; i < maxUnitCount; i++) {
                const unit = resultGetInfo[2][i.toString()];
                if (unit) {
                    charInfos.push(unit);
                }
                else {
                    break;
                }
            }
            const newServerList = [];
            const servers = await redisClient.hgetallAsync("NewServerList");
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
                auid: auid,
                cert_key: uuid,
                account_char_list: charInfos,
                server_list: server_list_service_1.serverListService.GetPublicServerList(),
                is_new_account: isNewAccount,
                new_server_list: newServerList,
            };
            const client = redis_service_1.redisService.getClient(redis_service_1.RedisType.TRADE1_INFO);
            client.getRedis().publish("notify_login", JSON.stringify({
                auid: auid,
            }));
            return response.status(200).json(responseObject);
        }
        catch (error) {
            logger_1.logger.error("[login] " + error.message);
            console.log(error);
            responseObject.error_code = error_code_1.ERROR.DB_ERROR;
            return response.status(500).json(responseObject);
        }
    }
    async postServerList(body, response) {
        const responseObject = getResponseObject();
        try {
            if (!checkProperty(body, ["account_gsn", "certification_key"])) {
                responseObject.error_code = error_code_1.ERROR.NO_BODY_ELEMENT;
                return response.status(200).json(responseObject);
            }
            if (body.account_gsn <= 0 || body.certification_key.length !== certKeyLength) {
                responseObject.error_code = error_code_1.ERROR.NO_BODY_ELEMENT;
                return response.status(200).json(responseObject);
            }
            const accountGSN = body.account_gsn;
            const certKey = body.certification_key;
            if ((await this.checkCert(accountGSN, certKey)) === false) {
                responseObject.error_code = error_code_1.ERROR.NO_BODY_ELEMENT;
                return response.status(200).json(responseObject);
            }
            responseObject.result = {
                server_list: server_list_service_1.serverListService.GetPublicServerList(),
            };
            return response.status(200).json(responseObject);
        }
        catch (error) {
            logger_1.logger.error("[serverlist] " + error.message);
            responseObject.error_code = error_code_1.ERROR.DB_ERROR;
            return response.status(500).json(responseObject);
        }
    }
    async optoolServerList(req, response) {
        const responseObject = getResponseObject();
        try {
            if (!checkProperty(req.query, ["key"]) || req.query.key != 'ntrance') {
                responseObject.error_code = error_code_1.ERROR.NO_BODY_ELEMENT;
                return response.status(200).json(responseObject);
            }
            responseObject.result = {
                server_list: server_list_service_1.serverListService.GetServerListAll(),
            };
            return response.status(200).json(responseObject);
        }
        catch (error) {
            logger_1.logger.error("[/optool/serverlist] " + error.message);
            responseObject.error_code = error_code_1.ERROR.DB_ERROR;
            return response.status(500).json(responseObject);
        }
    }
    async LoginGameserverController(body, req, response) {
        const responseObject = getResponseObject();
        try {
            const redisClient = redis_service_1.redisService.getClient(redis_service_1.RedisType.RedisType_Optool);
            if (!redisClient) {
                responseObject.error_code = error_code_1.ERROR.REDIS_ERROR;
                return response.status(200).json(responseObject);
            }
            if (body.login_fail && body.login_fail == true) {
                console.log("body.login_fail == true /game/login");
                responseObject.error_code = error_code_1.ERROR.WHITE_LIST_ERROR;
                return response.status(200).json(responseObject);
            }
            const checkIp = await redisClient.get("EnableWhiteList");
            const checkChannelList = await redisClient.hgetallAsync("EnableWhiteListServer");
            const enableWhiteList = checkIp === "1";
            const enableChannelWhiteList = checkChannelList ? checkChannelList[`${body.server_id}`] === "1" : false;
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
            if (passUser === false) {
                responseObject.error_code = error_code_1.ERROR.WHITE_LIST_ERROR;
                return response.status(200).json(responseObject);
            }
            if (!checkProperty(body, ["server_id", "auid", "cert_key"])) {
                responseObject.error_code = error_code_1.ERROR.NO_BODY_ELEMENT;
                return response.status(200).json(responseObject);
            }
            const serverId = body.server_id;
            const auid = body.auid;
            const certKey = body.cert_key;
            if (serverId <= 0 || auid <= 0 || certKey.length !== certKeyLength) {
                responseObject.error_code = error_code_1.ERROR.NO_BODY_ELEMENT;
                return response.status(200).json(responseObject);
            }
            if ((await this.checkCert(auid, certKey)) === false) {
                responseObject.error_code = error_code_1.ERROR.CERT_KEY_ERROR;
                return response.status(200).json(responseObject);
            }
            const server = server_list_service_1.serverListService.GetServerEndpoint(serverId);
            if (server === null) {
                responseObject.error_code = error_code_1.ERROR.ERROR_3499;
                return response.status(200).json(responseObject);
            }
            const server_group_id = server.server_group_id;
            const passLoginWait = this.checkWhiteList(req);
            if (passLoginWait === true) {
                console.log("passLoginWait = true " + req.connection.remoteAddress);
            }
            else {
                console.log("passLoginWait = false " + req.connection.remoteAddress);
            }
            let waitCount = -1;
            if ((await redis_service_1.redisService.existKeyInGameAccept(server_group_id, auid)) > 0 || passLoginWait === true) {
                if (await redis_service_1.redisService.addToGameAccept(server_group_id, auid)) {
                    if (await redis_service_1.redisService.addExpireTimeToGameAccept(server_group_id, auid)) {
                        waitCount = 0;
                    }
                }
            }
            else {
                if (await redis_service_1.redisService.addToLoginWait(server_group_id, auid)) {
                    if (await redis_service_1.redisService.addExpireTimeToLoginWait(server_group_id, auid)) {
                        if (await redis_service_1.redisService.addToLoginWaitList(server_group_id, auid)) {
                            waitCount = await redis_service_1.redisService.getLoginWaitListRank(server_group_id, auid);
                            if (waitCount === 0) {
                                waitCount = 1;
                            }
                        }
                    }
                }
            }
            if (waitCount === 1) {
                const client = redis_service_1.redisService.getClient(redis_service_1.RedisType.TRADE1_INFO);
                client.getRedis().publish("notify_login", JSON.stringify({
                    auid: auid,
                }));
            }
            let hostName = server.host;
            let ip = req.headers["x-real-ip"] || req.connection.remoteAddress;
            const includes = ip.includes("127.0.0.1") || ip.includes("192.168.0.");
            const env = process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "aws_qa" && process.env.NODE_ENV !== "bot";
            if (serverId === 1 && includes && env) {
                hostName = "192.168.0.79";
            }
            responseObject.result = {
                server_id: serverId,
                host: hostName,
                port: server.port,
                wait_number: waitCount,
                frontend_server_list: server_list_service_1.serverListService.GetFrontEndServerList(),
            };
            return response.status(200).json(responseObject);
        }
        catch (error) {
            logger_1.logger.error("[game/login] " + error.message);
            responseObject.error_code = error_code_1.ERROR.DB_ERROR;
            return response.status(500).json(responseObject);
        }
    }
    async getRecommended(body, req, response) {
        const responseObject = getResponseObject();
        try {
            const redisClient = redis_service_1.redisService.getClient(redis_service_1.RedisType.RedisType_Optool);
            if (!redisClient) {
                responseObject.error_code = error_code_1.ERROR.REDIS_ERROR;
                return response.status(200).json(responseObject);
            }
            responseObject.result = {
                recommended_server_list: [],
                new_server_list: [],
                server_list: server_list_service_1.serverListService.GetPublicServerList(),
                wait_count_list: [],
                frontend_server_list: server_list_service_1.serverListService.GetFrontEndServerList(),
            };
            let servers = await redisClient.hgetallAsync("RecommendedServerList");
            if (servers) {
                for (let i = 1; i <= 20; i++) {
                    if (servers[`${i}`]) {
                        responseObject.result.recommended_server_list.push({ channel_id: i, recommended: Number.parseInt(servers[`${i}`]) });
                    }
                }
            }
            servers = await redisClient.hgetallAsync("NewServerList");
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
            let matchingKeys = await scanAsync("loginwait:*", { count: 100000 });
            for (const key of matchingKeys) {
                const data = key.split(":");
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
                    count: value,
                });
            }
            return response.status(200).json(responseObject);
        }
        catch (error) {
            logger_1.logger.error("[recommended] " + error.message);
            console.log(error);
            responseObject.error_code = error_code_1.ERROR.DB_ERROR;
            return response.status(500).json(responseObject);
        }
    }
    async postWhiteListEnable(body, response) {
        const responseObject = getResponseObject();
        try {
            if (!checkProperty(body, ["enable"])) {
                responseObject.error_code = error_code_1.ERROR.NO_BODY_ELEMENT;
                return response.status(200).json(responseObject);
            }
            const redisClient = redis_service_1.redisService.getClient(redis_service_1.RedisType.RedisType_Optool);
            if (!redisClient) {
                responseObject.error_code = error_code_1.ERROR.REDIS_ERROR;
                return response.status(200).json(responseObject);
            }
            redisClient.getRedis().set("EnableWhiteList", body.enable);
            return response.status(200).json(responseObject);
        }
        catch (error) {
            logger_1.logger.error("[serverlist] " + error.message);
            responseObject.error_code = error_code_1.ERROR.DB_ERROR;
            return response.status(500).json(responseObject);
        }
    }
    async postWhiteListChannelEnable(body, response) {
        const responseObject = getResponseObject();
        try {
            if (!checkProperty(body, ["enable"])) {
                responseObject.error_code = error_code_1.ERROR.NO_BODY_ELEMENT;
                return response.status(200).json(responseObject);
            }
            const redisClient = redis_service_1.redisService.getClient(redis_service_1.RedisType.RedisType_Optool);
            if (!redisClient) {
                responseObject.error_code = error_code_1.ERROR.REDIS_ERROR;
                return response.status(200).json(responseObject);
            }
            redisClient.getRedis().hset("EnableWhiteListServer", body.channel, body.enable);
            return response.status(200).json(responseObject);
        }
        catch (error) {
            logger_1.logger.error("[serverlist] " + error.message);
            responseObject.error_code = error_code_1.ERROR.DB_ERROR;
            return response.status(500).json(responseObject);
        }
    }
    async checkCert(gsn, cert) {
        const replacementsCert = [gsn, cert];
        const sqlCon = await database_main_mysql_1.db.getMysqlconnection();
        const [resultCert, fields] = await sqlCon.query(`CALL CHECK_CERTIFICATION_KEY (?,?)`, replacementsCert);
        sqlCon.release();
        if (resultCert[0][0].errorCode) {
            return false;
        }
        return resultCert[1][0].v_ExistsCheck > 0;
    }
    async checkServerMaintenance() {
        return 1;
    }
    checkWhiteList(req) {
        let accept = false;
        let ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
        for (const acceptIp of ip_list) {
            if (ip.includes(acceptIp)) {
                return true;
            }
        }
        return false;
    }
};
__decorate([
    routing_controllers_1.Post("/login-third-party-sign"),
    __param(0, routing_controllers_1.Body()), __param(1, routing_controllers_1.Req()), __param(2, routing_controllers_1.Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], MyController.prototype, "postLoginThirdPartySign", null);
__decorate([
    routing_controllers_1.Post("/naver-sign"),
    __param(0, routing_controllers_1.Body()), __param(1, routing_controllers_1.Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MyController.prototype, "postNaverSign", null);
__decorate([
    routing_controllers_1.Post("/naver-sign-result"),
    __param(0, routing_controllers_1.Body()), __param(1, routing_controllers_1.Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MyController.prototype, "postNaverSignResult", null);
__decorate([
    routing_controllers_1.Post("/login/account"),
    __param(0, routing_controllers_1.Body()), __param(1, routing_controllers_1.Req()), __param(2, routing_controllers_1.Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], MyController.prototype, "LoginAccountController", null);
__decorate([
    routing_controllers_1.Post("/serverlist"),
    __param(0, routing_controllers_1.Body()), __param(1, routing_controllers_1.Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MyController.prototype, "postServerList", null);
__decorate([
    routing_controllers_1.Get('/optool/serverlist'),
    routing_controllers_1.Get('/serverlist'),
    __param(0, routing_controllers_1.Req()), __param(1, routing_controllers_1.Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MyController.prototype, "optoolServerList", null);
__decorate([
    routing_controllers_1.Post("/login/gameserver"),
    __param(0, routing_controllers_1.Body()), __param(1, routing_controllers_1.Req()), __param(2, routing_controllers_1.Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], MyController.prototype, "LoginGameserverController", null);
__decorate([
    routing_controllers_1.Get("/recommend"),
    __param(0, routing_controllers_1.Body()), __param(1, routing_controllers_1.Req()), __param(2, routing_controllers_1.Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], MyController.prototype, "getRecommended", null);
__decorate([
    routing_controllers_1.Post("/whitelist/enable"),
    __param(0, routing_controllers_1.Body()), __param(1, routing_controllers_1.Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MyController.prototype, "postWhiteListEnable", null);
__decorate([
    routing_controllers_1.Post("/whitelist/channel/enable"),
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
        result: null,
    };
};
