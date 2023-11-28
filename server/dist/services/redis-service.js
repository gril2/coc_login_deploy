"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisService = exports.ServerUUID = exports.RedisType = void 0;
const util_1 = require("util");
const redis = require("redis");
const logger_1 = require("../logger");
const server_list_service_1 = require("./server-list-service");
const config_1 = require("../config/config");
const uuid_1 = require("uuid");
const request = require("request-promise");
var RedisType;
(function (RedisType) {
    RedisType[RedisType["GSN_INFO"] = 0] = "GSN_INFO";
    RedisType[RedisType["GAME_INFO"] = 1] = "GAME_INFO";
    RedisType[RedisType["NICKNAME_INFO"] = 2] = "NICKNAME_INFO";
    RedisType[RedisType["TRADE1_INFO"] = 3] = "TRADE1_INFO";
    RedisType[RedisType["TRADE2_INFO"] = 4] = "TRADE2_INFO";
    RedisType[RedisType["RANKING_INFO"] = 5] = "RANKING_INFO";
    RedisType[RedisType["LOGIN_WAIT1_INFO"] = 6] = "LOGIN_WAIT1_INFO";
    RedisType[RedisType["LOGIN_WAIT2_INFO"] = 7] = "LOGIN_WAIT2_INFO";
    RedisType[RedisType["GAME_ACCEPT1_INFO"] = 8] = "GAME_ACCEPT1_INFO";
    RedisType[RedisType["GAME_ACCEPT2_INFO"] = 9] = "GAME_ACCEPT2_INFO";
    RedisType[RedisType["TRADE_PRODUCTION_MANAGER"] = 10] = "TRADE_PRODUCTION_MANAGER";
    RedisType[RedisType["TRADE_ITEM_INFO"] = 11] = "TRADE_ITEM_INFO";
    RedisType[RedisType["RedisType_Guild"] = 12] = "RedisType_Guild";
    RedisType[RedisType["RedisType_ClientData"] = 13] = "RedisType_ClientData";
    RedisType[RedisType["RedisType_DuelData"] = 14] = "RedisType_DuelData";
    RedisType[RedisType["RedisType_Optool"] = 15] = "RedisType_Optool";
    RedisType[RedisType["INNER_PUBLISHER"] = 100] = "INNER_PUBLISHER";
    RedisType[RedisType["INNER_SUBSCRIBER"] = 101] = "INNER_SUBSCRIBER";
})(RedisType = exports.RedisType || (exports.RedisType = {}));
exports.ServerUUID = uuid_1.v4();
const EXPIRE_ADD_SECONDS = 60;
class RedisService {
    constructor() {
        this._clients = new Map();
        this._redisInfo = new Map();
    }
    async requestRedisInfo() {
        const option = {
            headers: { 'content-type': 'application/json', 'api-key': config_1.util_server_api_key },
            url: `${config_1.getDBConfigUrl()}/redis`,
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
                    this._redisInfo.set(info.tag, info);
                }
            }
            return true;
        }
        catch (error) {
            logger_1.logger.error(error);
            return false;
        }
    }
    async start() {
        const result = await this.requestRedisInfo();
        if (result === false) {
            logger_1.logger.error('[REDIS] Call api failed');
            process.exit(0);
            return;
        }
        for (const [key, value] of this._redisInfo.entries()) {
            console.log(key + " " + value);
            if (key === RedisType.GSN_INFO ||
                key === RedisType.GAME_INFO ||
                key === RedisType.LOGIN_WAIT1_INFO ||
                key === RedisType.LOGIN_WAIT2_INFO ||
                key === RedisType.GAME_ACCEPT1_INFO ||
                key === RedisType.GAME_ACCEPT2_INFO ||
                key === RedisType.TRADE1_INFO ||
                key === RedisType.RedisType_Optool) {
                const client = new RedisClient();
                this._clients.set(key, client);
                client.connect(value);
            }
            if (key === RedisType.GAME_ACCEPT1_INFO) {
                {
                    const client = new RedisClient();
                    this._clients.set(RedisType.INNER_PUBLISHER, client);
                    client.connectForInner(RedisType.INNER_PUBLISHER, value);
                }
                {
                    const client = new RedisClient();
                    this._clients.set(RedisType.INNER_SUBSCRIBER, client);
                    client.connectForInner(RedisType.INNER_SUBSCRIBER, value);
                }
            }
        }
    }
    close() {
        for (const [key, value] of this._clients.entries()) {
        }
    }
    getClient(type) {
        return this._clients.get(type);
    }
    async existKeyInGameAccept(channelId, gsn) {
        console.log('existKeyInGameAccept ' + channelId + " " + gsn);
        const client = this._clients.get(RedisType.GAME_ACCEPT1_INFO);
        if (client) {
            const key = `gameaccept:${channelId}:${gsn}`;
            console.log(key);
            return await client.existsAsync(key);
        }
        return false;
    }
    addToGameAccept(channelId, gsn) {
        const client = this._clients.get(RedisType.GAME_ACCEPT1_INFO);
        if (client) {
            const key = `gameaccept:${channelId}:${gsn}`;
            const member = `${gsn}`;
            console.log(key);
            console.log(member);
            client.getRedis().sadd(key, member);
            return true;
        }
        return false;
    }
    addExpireTimeToGameAccept(channelId, gsn) {
        const client = this._clients.get(RedisType.GAME_ACCEPT1_INFO);
        if (client) {
            const key = `gameaccept:${channelId}:${gsn}`;
            const member = `${gsn}`;
            client.getRedis().expire(key, EXPIRE_ADD_SECONDS, (err, reply) => {
                if (err) {
                    client.getRedis().del(key);
                }
            });
            return true;
        }
        return false;
    }
    deleteLoginWaitKey(channelId, gsn) {
        const client = this._clients.get(RedisType.LOGIN_WAIT1_INFO);
        if (client) {
            const key = `loginwait:${channelId}:${gsn}`;
            client.getRedis().del(key);
        }
    }
    addToLoginWait(channelId, gsn) {
        const client = this._clients.get(RedisType.LOGIN_WAIT1_INFO);
        if (client) {
            const key = `loginwait:${channelId}:${gsn}`;
            const member = `${gsn}`;
            client.getRedis().sadd(key, member);
            return true;
        }
        return false;
    }
    addExpireTimeToLoginWait(channelId, gsn) {
        const client = this._clients.get(RedisType.LOGIN_WAIT1_INFO);
        if (client) {
            const key = `loginwait:${channelId}:${gsn}`;
            const member = `${gsn}`;
            client.getRedis().expire(key, EXPIRE_ADD_SECONDS, (err, reply) => {
                if (err) {
                    logger_1.logger.info(err);
                    client.getRedis().del(key);
                }
            });
            return true;
        }
        return false;
    }
    async addToLoginWaitList(channelId, gsn) {
        const client = this._clients.get(RedisType.LOGIN_WAIT2_INFO);
        if (client) {
            const date = new Date();
            const key = `loginwait:${channelId}`;
            const member = `${gsn}`;
            const rank = await client.zrankAsync(key, member);
            if (rank === null || rank === undefined) {
                client.getRedis().zadd(key, date.getTime(), member);
            }
            return true;
        }
        return false;
    }
    async getLoginWaitListRank(channelId, gsn) {
        const client = this._clients.get(RedisType.LOGIN_WAIT2_INFO);
        if (client) {
            const date = new Date();
            const key = `loginwait:${channelId}`;
            const member = `${gsn}`;
            return await client.zrankAsync(key, member);
        }
        return -1;
    }
}
class RedisClient {
    constructor() {
        this._connectInfo = null;
        this._getAsync = null;
        this._hgetallAsync = null;
        this._existsAsync = null;
        this._zrankAsync = null;
        this._incrAsync = null;
    }
    connect(info) {
        this._connectInfo = info;
        this._client = redis.createClient({
            host: info.ip,
            port: info.port,
            db: info.db,
        });
        if (info.auth.length > 0) {
            this._client.auth(info.auth);
        }
        this._client.on('connect', this.onConnect.bind(this));
        this._client.on('reconnecting', this.onReconnecting.bind(this));
        this._client.on('error', this.onError.bind(this));
        this._getAsync = util_1.promisify(this._client.get).bind(this._client);
        this._hgetallAsync = util_1.promisify(this._client.hgetall).bind(this._client);
        this._existsAsync = util_1.promisify(this._client.exists).bind(this._client);
        this._zrankAsync = util_1.promisify(this._client.zrank).bind(this._client);
        this._incrAsync = util_1.promisify(this._client.incr).bind(this._client);
    }
    connectForInner(type, info) {
        this._connectInfo = {
            redis_tag_type: type
        };
        this._client = redis.createClient({
            host: info.ip,
            port: info.port,
            db: 11,
        });
        if (info.auth.length > 0) {
            this._client.auth(info.auth);
        }
        this._client.on('connect', this.onConnect.bind(this));
        this._client.on('reconnecting', this.onReconnecting.bind(this));
        this._client.on('error', this.onError.bind(this));
    }
    onConnect() {
        logger_1.logger.info(`[redis][tag:${this._connectInfo.redis_tag_type}] connected`);
        if (this._connectInfo.redis_tag_type === RedisType.GAME_ACCEPT2_INFO) {
            this._client.unsubscribe();
            this._client.on('subscribe', this.onSubscribe.bind(this));
            this._client.on('message', this.onMessage.bind(this));
            this._client.subscribe('server_info');
        }
        else if (this._connectInfo.redis_tag_type === RedisType.INNER_SUBSCRIBER) {
            this._client.unsubscribe();
            this._client.on('subscribe', this.onSubscribe.bind(this));
            this._client.on('message', this.onMessage.bind(this));
            this._client.subscribe('server_info_inner');
        }
    }
    onReconnecting() {
        logger_1.logger.warn(`[redis][tag:${this._connectInfo.tag}] reconneting`);
    }
    onError(error) {
        logger_1.logger.error(`[redis][tag:${this._connectInfo.tag}] ${error}`);
    }
    onSubscribe(channel, message) {
        logger_1.logger.info(`[redis][tag:${this._connectInfo.tag}][subscribe] ${channel}:${message}`);
    }
    onMessage(channel, message) {
        try {
            if (channel === 'server_info_inner') {
                const serverInfoInner = JSON.parse(message);
                if (serverInfoInner.uuid !== exports.ServerUUID) {
                    server_list_service_1.serverListService.SetServer(serverInfoInner.server_info);
                }
            }
            else {
                const serverInfo = JSON.parse(message);
                server_list_service_1.serverListService.SetServer(serverInfo);
            }
        }
        catch (error) {
            logger_1.logger.error(`[redis][onMessage] ${error}`);
        }
    }
    getRedis() {
        return this._client;
    }
    async get(key) {
        return await this._getAsync(key);
    }
    async hgetallAsync(key) {
        return await this._hgetallAsync(key);
    }
    async existsAsync(key) {
        return await this._existsAsync(key);
    }
    async zrankAsync(key, member) {
        return await this._zrankAsync(key, member);
    }
    async incrAsync(key) {
        return await this._incrAsync(key);
    }
}
exports.redisService = new RedisService();
