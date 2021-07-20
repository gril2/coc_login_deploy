"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverListService = exports.ServerType = void 0;
const redis_service_1 = require("./redis-service");
var ServerType;
(function (ServerType) {
    ServerType[ServerType["GAME"] = 0] = "GAME";
    ServerType[ServerType["INTER_DUNGEON"] = 1] = "INTER_DUNGEON";
    ServerType[ServerType["INTER_PRISON"] = 2] = "INTER_PRISON";
    ServerType[ServerType["INTER_GUILDBOSS"] = 3] = "INTER_GUILDBOSS";
    ServerType[ServerType["INTER_SIEGE"] = 4] = "INTER_SIEGE";
    ServerType[ServerType["INTER_COLOSSEUM"] = 5] = "INTER_COLOSSEUM";
    ServerType[ServerType["INTER_MAX"] = 6] = "INTER_MAX";
    ServerType[ServerType["NONE"] = 100] = "NONE";
    ServerType[ServerType["DEVELOPMENT"] = 101] = "DEVELOPMENT";
    ServerType[ServerType["LOGIN"] = 102] = "LOGIN";
    ServerType[ServerType["PAYMENT"] = 103] = "PAYMENT";
})(ServerType = exports.ServerType || (exports.ServerType = {}));
class ServerListService {
    constructor() {
        this._serverList = new Map();
        this._interval = null;
        this._channelName = new Map();
        this._interval = setInterval(this.setDisableChannel.bind(this), 1000 * 60);
    }
    close() {
        if (this._interval) {
            clearInterval(this._interval);
        }
    }
    setServer(serverInfo) {
        const server = this._serverList.get(serverInfo.ushChannelID);
        if (server) {
            server.channel_id = serverInfo.ushChannelID;
            server.server_type = serverInfo.eServerType;
            server.max_user_count = serverInfo.ushMaxUserCount;
            server.current_user_count = serverInfo.ushCurrentUserCount;
            server.max_current_user_count = serverInfo.ushMaxCurrentUserCount;
            server.external_host_name = serverInfo.strExternalHostname;
            server.external_port_list = serverInfo.ushExternalPortAr;
            server.create_character_available = serverInfo.createUnitAvailable;
            server.update_date = new Date();
        }
        else {
            const insertServer = {
                channel_id: serverInfo.ushChannelID,
                server_type: serverInfo.eServerType,
                max_user_count: serverInfo.ushMaxUserCount,
                current_user_count: serverInfo.ushCurrentUserCount,
                max_current_user_count: serverInfo.ushMaxCurrentUserCount ? serverInfo.ushMaxCurrentUserCount : 0,
                create_character_available: serverInfo.createUnitAvailable,
                disable_from_list: false,
                external_host_name: serverInfo.strExternalHostname,
                external_port_list: serverInfo.ushExternalPortAr,
                update_date: new Date()
            };
            this._serverList.set(insertServer.channel_id, insertServer);
        }
    }
    getServerList() {
        const date = new Date();
        const serverList = [];
        for (const [key, value] of this._serverList.entries()) {
            const miniInfo = this.getMinimalInfo(value, date);
            if (miniInfo.channel_id >= 400) {
                continue;
            }
            if (!(miniInfo.channel_id >= 100 && miniInfo.warning)) {
                serverList.push(this.getMinimalInfo(value, date));
            }
        }
        return serverList;
    }
    getServerListAll() {
        const date = new Date();
        const serverList = [];
        for (const [key, value] of this._serverList.entries()) {
            serverList.push(value);
        }
        return serverList;
    }
    getServerListWithType(channelId, serverType) {
        const serverList = [];
        for (const [key, value] of this._serverList.entries()) {
            if (value.channel_id === channelId && value.server_type === serverType) {
                serverList.push(value);
                break;
            }
        }
        return serverList;
    }
    getMinimalInfo(serverInfo, currDate) {
        const diffTime = currDate.getTime() - serverInfo.update_date.getTime();
        return {
            channel_id: serverInfo.channel_id,
            server_type: serverInfo.server_type,
            max_user_count: serverInfo.max_user_count,
            current_user_count: serverInfo.current_user_count,
            disable_from_list: serverInfo.disable_from_list,
            max_current_user_count: serverInfo.max_current_user_count,
            create_character_available: serverInfo.create_character_available,
            warning: diffTime > 15000 ? true : false
        };
    }
    async setDisableChannel() {
        const redisClient = redis_service_1.redisService.getClient(redis_service_1.RedisType.GAME_INFO);
        if (!redisClient) {
        }
        const servers = await redisClient.hgetallAsync('DisableServerList');
        if (servers) {
            for (const [key, value] of this._serverList.entries()) {
                value.disable_from_list = servers[`${key}`] === '1' ? true : false;
            }
        }
    }
}
exports.serverListService = new ServerListService;
