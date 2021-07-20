"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stream = exports.logger = void 0;
const fs = require("fs");
const wdrf = require("winston-daily-rotate-file");
const winston = require("winston");
const config_1 = require("./config/config");
const logDir = 'log';
let config = config_1.loggerConfig;
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}
config.file.filename = `${logDir}/${config.file.filename}`;
const env = process.env.NODE_ENV || 'development';
exports.logger = winston.createLogger({
    level: env === 'development' ? 'debug' : 'info',
    format: winston.format.combine(winston.format.timestamp({
        format: "YYYY-MM-DD HH:mm:ss"
    }), winston.format.json()),
    transports: [
        new wdrf(config.file)
    ],
    exitOnError: false
});
exports.stream = {
    write: (message, encoding) => {
        exports.logger.info(message);
    }
};
