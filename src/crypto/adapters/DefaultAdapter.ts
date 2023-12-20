import crypto from 'crypto';

export class DefaultAdapter {
  public symmetricEncrypt(dataToEncrypt: string, symmetricKey: Buffer, initVector: Buffer): string {
    const messageCipher = crypto.createCipheriv('aes256', Buffer.from(symmetricKey), Buffer.from(initVector));
    let encryptedData = messageCipher.update(dataToEncrypt, 'utf-8', 'base64');
    encryptedData += messageCipher.final('base64');

    return encryptedData;
  }

  public symmetricDecrypt(dataToDecrypt: string, symmetricKey: Buffer, initVector: Buffer): string {
    const decipher = crypto.createDecipheriv('aes256', Buffer.from(symmetricKey), Buffer.from(initVector));
    let decryptedData = decipher.update(dataToDecrypt, 'base64', 'utf-8');
    decryptedData += decipher.final('utf-8');

    return decryptedData;
  }
}
