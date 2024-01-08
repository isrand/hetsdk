"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultAdapter = void 0;
const crypto_1 = __importDefault(require("crypto"));
class DefaultAdapter {
    symmetricEncrypt(dataToEncrypt, symmetricKey, initVector) {
        const cipher = crypto_1.default.createCipheriv('aes-256-gcm', Buffer.from(symmetricKey), Buffer.from(initVector));
        let encryptedData = cipher.update(dataToEncrypt, 'utf8', 'base64');
        encryptedData += cipher.final('base64');
        const encryptedPayload = {
            cipherText: encryptedData,
            tag: cipher.getAuthTag().toString('base64')
        };
        return Buffer.from(JSON.stringify(encryptedPayload)).toString('base64');
    }
    symmetricDecrypt(dataToDecrypt, symmetricKey, initVector) {
        const encryptedPayload = JSON.parse(Buffer.from(dataToDecrypt, 'base64').toString('utf8'));
        const decipher = crypto_1.default.createDecipheriv('aes-256-gcm', Buffer.from(symmetricKey), Buffer.from(initVector));
        decipher.setAuthTag(Buffer.from(encryptedPayload.tag, 'base64'));
        let decryptedData = decipher.update(encryptedPayload.cipherText, 'base64', 'utf-8');
        decryptedData += decipher.final('utf-8');
        return decryptedData;
    }
}
exports.DefaultAdapter = DefaultAdapter;
//# sourceMappingURL=DefaultAdapter.js.map