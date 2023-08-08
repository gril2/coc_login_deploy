"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseConfigLoadRunnerOptool = exports.databaseConfigOptool = exports.databaseConfigBotMain = exports.databaseConfigCode = exports.databaseConfigLoadRunnerCode = exports.databaseConfigLoadRunnerMain = exports.databaseConfigQACode = exports.databaseConfigQAMain = exports.databaseConfigProd = exports.databaseConfigDev = void 0;
exports.databaseConfigDev = {
    dialect: "mysql",
    ssl: null,
    maxpool: 5,
    minpool: 2,
    idlepool: 10000,
    logging: console.log,
    force: false,
    timezone: "+09:00",
};
exports.databaseConfigProd = {
    dialect: "mysql",
    ssl: null,
    maxpool: 5,
    minpool: 2,
    idlepool: 10000,
    logging: false,
    force: false,
    timezone: "+09:00",
};
exports.databaseConfigQAMain = {
    dialect: "mysql",
    ssl: null,
    maxpool: 10,
    minpool: 3,
    idlepool: 10000,
    logging: false,
    force: false,
    timezone: "+09:00",
};
exports.databaseConfigQACode = {
    dialect: "mysql",
    ssl: null,
    maxpool: 3,
    minpool: 2,
    idlepool: 10000,
    logging: false,
    force: false,
    timezone: "+09:00",
};
exports.databaseConfigLoadRunnerMain = {
    dialect: "mysql",
    ssl: null,
    maxpool: 10,
    minpool: 3,
    idlepool: 10000,
    logging: false,
    force: false,
    timezone: "+09:00",
};
exports.databaseConfigLoadRunnerCode = {
    dialect: "mysql",
    ssl: null,
    maxpool: 2,
    minpool: 2,
    idlepool: 10000,
    logging: false,
    force: false,
    timezone: "+09:00",
};
exports.databaseConfigCode = {
    dialect: "mysql",
    ssl: null,
    maxpool: 2,
    minpool: 2,
    idlepool: 10000,
    logging: false,
    force: false,
    timezone: "+09:00",
};
exports.databaseConfigBotMain = {
    dialect: "mysql",
    ssl: null,
    maxpool: 5,
    minpool: 2,
    idlepool: 10000,
    logging: false,
    force: false,
    timezone: "+09:00",
};
exports.databaseConfigOptool = {
    dialect: "mysql",
    ssl: null,
    maxpool: 3,
    minpool: 2,
    idlepool: 10000,
    logging: console.log,
    force: false,
    timezone: "+09:00",
};
exports.databaseConfigLoadRunnerOptool = {
    dialect: "mysql",
    ssl: null,
    maxpool: 10,
    minpool: 5,
    idlepool: 10000,
    logging: console.log,
    force: false,
    timezone: "+09:00",
};
