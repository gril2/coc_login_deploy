"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authKeyMiddleware = void 0;
const config_1 = require("../../config/config");
const error_code_1 = require("../../error-code");
async function authKeyMiddleware(req, res, next) {
    if (!config_1.serverConfig.useAuth) {
        next();
        return;
    }
    if (req.headers['api-key']) {
        if (req.headers['api-key'] === config_1.serverConfig.apiKey) {
            next();
        }
        else {
            res.status(400).json({ errorCode: error_code_1.ERROR.AUTH_INVALID_APIKEY });
        }
    }
    else {
        res.status(400).json({ errorCode: error_code_1.ERROR.ELEMENT_NOEXIST });
    }
}
exports.authKeyMiddleware = authKeyMiddleware;
