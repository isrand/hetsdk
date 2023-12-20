const __importDefault = (this && this.__importDefault) || function (mod) {
  return (mod && mod.__esModule) ? mod : { default: mod };
};
Object.defineProperty(exports, '__esModule', { value: true });
exports.DefaultAdapter = void 0;
const crypto_1 = __importDefault(require('crypto'));

class DefaultAdapter {
  symmetricEncrypt(data, symmetricKey, initVector) {
    const messageCipher = crypto_1.default.createCipheriv('aes256', Buffer.from(symmetricKey), Buffer.from(initVector));
    let encryptedData = messageCipher.update(data, 'utf-8', 'base64');
    encryptedData += messageCipher.final('base64');
    return encryptedData;
  }

  symmetricDecrypt(data, symmetricKey, initVector) {
    const decipher = crypto_1.default.createDecipheriv('aes256', Buffer.from(symmetricKey), Buffer.from(initVector));
    let decryptedData = decipher.update(data, 'base64', 'utf-8');
    decryptedData += decipher.final('utf-8');
    return decryptedData;
  }
}
exports.DefaultAdapter = DefaultAdapter;
// # sourceMappingURL=DefaultAdapter.js.map
