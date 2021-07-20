"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggingConfig = void 0;
;
exports.loggingConfig = {
    file: {
        filename: "%DATE%-server.log",
        datePattern: 'YYYY-MM-DD',
    },
    console: {},
    directory: __dirname
};
