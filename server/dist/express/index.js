"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
class Express {
    constructor() {
        this.app = express();
        this.middleware();
        this.routes();
    }
    middleware() {
        this.app.use(bodyParser.json({ limit: '15mb' }));
        this.app.use(cors());
    }
    routes() {
        let router = express.Router();
        router.get('/test', function (req, res) {
            res.send('hello');
        });
        router.get('/elb-status', function (req, res) {
            res.status(200).send('ping');
        });
        this.app.use('/', router);
    }
    getApp() {
        return this.app;
    }
}
exports.App = new Express();
