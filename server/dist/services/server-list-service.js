"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverListService = void 0;
class ServerListService {
    constructor() {
        this.serverList = new Map();
        this.outDateTime = 15000;
        this.maxServerId = 255;
        this.outDateServerId = 100;
    }
    close() {
    }
    SetServer(serverInfo) {
        const server = {
            serverId: serverInfo.serverId,
            serverType: serverInfo.serverType,
            maxUserCount: serverInfo.maxUserCount,
            currentUserCount: serverInfo.currentUserCount,
            createCharacterAvailable: serverInfo.createCharacterAvailable,
            host: serverInfo.host,
            port: serverInfo.port,
            disableFromList: false,
            updateDate: new Date(),
        };
        this.serverList.set(server.serverId, server);
    }
    GetPublicServerList() {
        const curDate = new Date();
        const retServerList = [];
        for (const [key, serverInfo] of this.serverList.entries()) {
            if (serverInfo.disableFromList === true || serverInfo.serverId > this.maxServerId) {
                continue;
            }
            serverInfo.outDate = (curDate.getTime() - serverInfo.updateDate.getTime()) > this.outDateTime ? true : false;
            if (!(serverInfo.serverId >= this.outDateServerId && serverInfo.outDate)) {
                retServerList[key] = {
                    serverId: serverInfo.serverId,
                    serverType: serverInfo.serverType,
                    maxUserCount: serverInfo.maxUserCount,
                    currentUserCount: serverInfo.currentUserCount,
                    createCharacterAvailable: serverInfo.createCharacterAvailable,
                    disableFromList: false,
                    updateDate: new Date(),
                };
            }
        }
        return retServerList;
    }
    GetServerEndpoint(serverId) {
        if (this.serverList.has(serverId)) {
            return this.serverList.get(serverId);
        }
        return null;
    }
}
exports.serverListService = new ServerListService;
