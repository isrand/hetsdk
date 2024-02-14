"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KyberKey = void 0;
class KyberKey {
    constructor(keyIntArray) {
        this.keyIntArray = keyIntArray;
    }
    toString(encoding) {
        return Buffer.from(this.keyIntArray).toString(encoding);
    }
}
exports.KyberKey = KyberKey;
//# sourceMappingURL=KyberKey.js.map