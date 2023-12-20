"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultAdapter = void 0;
const crypto_1 = __importDefault(require("crypto"));
class DefaultAdapter {
    symmetricEncrypt(dataToEncrypt, symmetricKey, initVector) {
        const messageCipher = crypto_1.default.createCipheriv('aes256', Buffer.from(symmetricKey), Buffer.from(initVector));
        let encryptedData = messageCipher.update(dataToEncrypt, 'utf-8', 'base64');
        encryptedData += messageCipher.final('base64');
        return encryptedData;
    }
    symmetricDecrypt(dataToDecrypt, symmetricKey, initVector) {
        const decipher = crypto_1.default.createDecipheriv('aes256', Buffer.from(symmetricKey), Buffer.from(initVector));
        let decryptedData = decipher.update(dataToDecrypt, 'base64', 'utf-8');
        decryptedData += decipher.final('utf-8');
        return decryptedData;
    }
}
exports.DefaultAdapter = DefaultAdapter;
//# sourceMappingURL=DefaultAdapter.js.map