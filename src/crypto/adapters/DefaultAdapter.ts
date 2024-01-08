import crypto from 'crypto';
import {IEncryptedPayload} from '../interfaces/IEncryptedPayload';

export class DefaultAdapter {
  public symmetricEncrypt(dataToEncrypt: string, symmetricKey: Buffer, initVector: Buffer): string {
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(symmetricKey), Buffer.from(initVector));
    let encryptedData = cipher.update(dataToEncrypt, 'utf8', 'base64');
    encryptedData += cipher.final('base64');

    const encryptedPayload: IEncryptedPayload = {
      cipherText: encryptedData,
      tag: cipher.getAuthTag().toString('base64')
    };

    return Buffer.from(JSON.stringify(encryptedPayload)).toString('base64');
  }

  public symmetricDecrypt(dataToDecrypt: string, symmetricKey: Buffer, initVector: Buffer): string {
    const encryptedPayload: IEncryptedPayload = JSON.parse(Buffer.from(dataToDecrypt, 'base64').toString('utf8')) as IEncryptedPayload;

    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(symmetricKey), Buffer.from(initVector));
    decipher.setAuthTag(Buffer.from(encryptedPayload.tag, 'base64'));

    let decryptedData = decipher.update(encryptedPayload.cipherText, 'base64', 'utf-8');
    decryptedData += decipher.final('utf-8');

    return decryptedData;
  }
}
