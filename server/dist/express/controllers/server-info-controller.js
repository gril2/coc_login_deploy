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
const error_code_1 = require("../../error-code");
const logger_1 = require("../../logger");
const server_list_service_1 = require("../../services/server-list-service");
const redis_service_1 = require("../../services/redis-service");
const auth_middleware_1 = require("../middlewares/auth-middleware");
var PlatformType;
(function (PlatformType) {
    PlatformType[PlatformType["GUEST"] = 0] = "GUEST";
    PlatformType[PlatformType["APPLE_GAME_CENTER"] = 1] = "APPLE_GAME_CENTER";
    PlatformType[PlatformType["FACEBOOK"] = 2] = "FACEBOOK";
    PlatformType[PlatformType["GOOGLE_PLAY_GAME"] = 3] = "GOOGLE_PLAY_GAME";
})(PlatformType = exports.PlatformType || (exports.PlatformType = {}));
let MyController = class MyController {
    constructor() {
    }
    async postServerInfo(body, response) {
        const responseObject = getResponseObject();
        try {
            const serverInfo = body.server_info;
            server_list_service_1.serverListService.SetServer(serverInfo);
            const client = redis_service_1.redisService.getClient(redis_service_1.RedisType.INNER_PUBLISHER);
            if (client) {
                client.getRedis().publish('server_info_inner', JSON.stringify({
                    uuid: redis_service_1.ServerUUID,
                    server_info: serverInfo
                }));
            }
            return response.status(200).json(responseObject);
        }
        catch (error) {
            logger_1.logger.error('[serverinfo] ' + error.message);
            responseObject.error_code = error_code_1.ERROR.DB_ERROR;
            return response.status(500).json(responseObject);
        }
    }
};
__decorate([
    routing_controllers_1.Post('/serverinfo'),
    __param(0, routing_controllers_1.Body()), __param(1, routing_controllers_1.Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MyController.prototype, "postServerInfo", null);
MyController = __decorate([
    routing_controllers_1.JsonController(),
    routing_controllers_1.UseBefore(auth_middleware_1.authKeyMiddleware),
    __metadata("design:paramtypes", [])
], MyController);
exports.MyController = MyController;
const getResponseObject = () => {
    return {
        error_code: 0,
        result: null
    };
};
