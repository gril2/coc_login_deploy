"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverListService = void 0;
class ServerListService {
    constructor() {
        this.serverList = new Map();
        this.FEServerList = new Array();
        this.outDateTime = 15000;
        this.maxServerId = 511;
        this.outDateServerId = 31;
    }
    close() {
    }
    SetServer(serverInfo) {
        if (serverInfo.server_flavor == "coc_contents" || serverInfo.server_flavor == "coc_development") {
            for (const serverId of serverInfo.server_id_array) {
                const server = {
                    serverId: serverId,
                    server_group_id: serverInfo.server_group_id,
                    maxUserCount: serverInfo.maxUserCount,
                    currentUserCount: serverInfo.currentUserCount,
                    createCharacterAvailable: serverInfo.createCharacterAvailable,
                    host: serverInfo.host,
                    port: serverInfo.port,
                    server_flavor: serverInfo.server_flavor,
                    disableFromList: serverInfo.disableFromList,
                    updateDate: new Date(),
                };
                this.serverList.set(server.serverId, server);
            }
        }
        else if (serverInfo.server_flavor == "coc_frontend") {
            const server = {
                maxUserCount: serverInfo.maxUserCount,
                currentUserCount: serverInfo.currentUserCount,
                createCharacterAvailable: serverInfo.createCharacterAvailable,
                host: serverInfo.host,
                port: serverInfo.port,
                server_flavor: serverInfo.server_flavor,
                disableFromList: serverInfo.disableFromList,
                client_open: serverInfo.client_open,
                updateDate: new Date(),
            };
            this.FEServerList.push(server);
        }
    }
    GetFrontEndServerList() {
        const retServerList = [];
        if (process.env.NODE_ENV !== 'production') {
            const curDate = new Date();
            for (const [key, serverInfo] of this.serverList.entries()) {
                if (serverInfo.server_flavor != "coc_frontend" && serverInfo.server_flavor != "coc_development") {
                    continue;
                }
                serverInfo.outDate = (curDate.getTime() - serverInfo.updateDate.getTime()) > 1500 ? true : false;
                if (!serverInfo.outDate) {
                    retServerList.push({
                        host: serverInfo.host,
                        port: serverInfo.port,
                        server_flavor: serverInfo.server_flavor,
                        serverId: serverInfo.serverId
                    });
                }
            }
            for (const serverInfo of this.FEServerList) {
                serverInfo.outDate = (curDate.getTime() - serverInfo.updateDate.getTime()) > 1500 ? true : false;
                if (!serverInfo.outDate && serverInfo.client_open) {
                    retServerList.push({
                        host: serverInfo.host,
                        port: serverInfo.port,
                        server_flavor: serverInfo.server_flavor,
                        serverId: serverInfo.serverId
                    });
                }
            }
        }
        else {
            retServerList.push({
                host: 'CocFEInternet-dbd693b20eb4e5dd.elb.ap-northeast-2.amazonaws.com',
                port: 15102,
                server_flavor: "coc_frontend",
                serverId: 300
            });
        }
        return retServerList;
    }
    GetPublicServerList() {
        const curDate = new Date();
        const retServerList = [];
        for (const [key, serverInfo] of this.serverList.entries()) {
            if (serverInfo.disableFromList === true || serverInfo.serverId > this.maxServerId) {
                continue;
            }
            serverInfo.outDate = (curDate.getTime() - serverInfo.updateDate.getTime()) > this.outDateTime ? true : false;
            if (serverInfo && !serverInfo.outDate) {
                retServerList.push({
                    serverId: serverInfo.serverId,
                    maxUserCount: serverInfo.maxUserCount,
                    currentUserCount: serverInfo.currentUserCount,
                    createCharacterAvailable: serverInfo.createCharacterAvailable,
                    disableFromList: false,
                    updateDate: serverInfo.updateDate,
                });
                console.log('GetPublicServerList ' + serverInfo.serverId);
            }
        }
        return retServerList;
    }
    GetServerListAll() {
        const retServerList = [];
        console.log(`GetServerListAll:`);
        for (const [_, serverInfo] of this.serverList.entries()) {
            retServerList.push(serverInfo);
            console.log(`serverInfo:${JSON.stringify(serverInfo)}`);
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
