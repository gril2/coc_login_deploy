"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockLocaleService = void 0;
class BlockLocaleService {
    constructor() {
        this._localeMap = new Map();
        let blockId = 10000;
        let localeId = 100000000;
        let localeIdAdd = 0;
        for (let i = 0; i < 10; i++) {
            localeIdAdd++;
            for (let j = 1; j <= 5; j++) {
                if (j === 5) {
                    localeIdAdd++;
                }
                this._localeMap.set(blockId + j, localeId + localeIdAdd);
            }
            blockId += 10000;
        }
    }
    test() {
        console.log(this._localeMap);
    }
    getLocaleId(blockId) {
        const localeId = this._localeMap.get(blockId);
        return !localeId ? 0 : localeId;
    }
}
exports.blockLocaleService = new BlockLocaleService;
