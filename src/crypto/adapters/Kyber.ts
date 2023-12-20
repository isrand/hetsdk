/* eslint-disable */
// ESLint truly despises this file due to the use of the
// crystals-kyber package. I am working on a type definition for said
// package, but for now this will have to do...
import {ICryptoAdapter} from '../interfaces/ICryptoAdapter';
import {IEncryptedTopicKeysObject} from '../interfaces/IEncryptedTopicKeysObject';
import {ITopicData} from '../../hedera/interfaces/ITopicData';
import {ITopicEncryptionKeyAndInitVector} from '../../hedera/interfaces/ITopicEncryptionKeyAndInitVector';
import {DefaultAdapter} from './DefaultAdapter';
import {IKeyPair} from '../interfaces/IKeyPair';

const kyber = require('crystals-kyber');

export class Kyber extends DefaultAdapter implements ICryptoAdapter {
  public constructor(private readonly keySize: number) {
    super();
  }

  public generateKeyPair(): IKeyPair {
    switch (this.keySize) {
      case 512:
        const KEYS_512 = kyber.KeyGen512();

        return {
          publicKey: Buffer.from(KEYS_512[0]).toString('base64'),
          privateKey: Buffer.from(KEYS_512[1]).toString('base64')
        };
      case 768:
        const KEYS_768 = kyber.KeyGen768();

        return {
          publicKey: Buffer.from(KEYS_768[0]).toString('base64'),
          privateKey: Buffer.from(KEYS_768[1]).toString('base64')
        };
      case 1024:
        const KEYS_1024 = kyber.KeyGen1024();

        return {
          publicKey: Buffer.from(KEYS_1024[0]).toString('base64'),
          privateKey: Buffer.from(KEYS_1024[1]).toString('base64')
        };
      default:
        throw new Error('Kyber adapter was initialized with wrong key size. Available sizes are 512, 768 and 1024.');
    }
  }

  public getEncryptedTopicKeysObject(topicEncryptionKey: Buffer, topicEncryptionInitVector: Buffer, publicKeys: Array<string>): IEncryptedTopicKeysObject {
    const encryptedTopicKeysObject: IEncryptedTopicKeysObject = {
      a: [],
      b: []
    };

    // Initialize the "c" key in the encrypted topic objects since we are using Kyber
    encryptedTopicKeysObject.c = [];

    for (const publicKey of publicKeys) {
      const symmetricAndEncapsulatedKey: Array<Array<number>> = this.getSymmetricAndEncapsulatedKey(Buffer.from(publicKey, 'base64'));

      const encapsulatedSymmetricKey: Array<number> | undefined = symmetricAndEncapsulatedKey[0];
      const symmetricKey: Array<number> | undefined = symmetricAndEncapsulatedKey[1];

      const initVector: Buffer = this.getInitVectorFromSymmetricKeyNumberArray(symmetricKey);

      const encryptedTopicEncryptionKey = this.symmetricEncrypt(Buffer.from(topicEncryptionKey).toString('base64'), Buffer.from(symmetricKey), initVector);
      const encryptedTopicInitVector = this.symmetricEncrypt(Buffer.from(topicEncryptionInitVector).toString('base64'), Buffer.from(symmetricKey), initVector);

      encryptedTopicKeysObject.a.push(encryptedTopicEncryptionKey);
      encryptedTopicKeysObject.b.push(encryptedTopicInitVector);
      encryptedTopicKeysObject.c.push(Buffer.from(encapsulatedSymmetricKey).toString('base64'));
    }

    return encryptedTopicKeysObject;
  }

  public decryptTopicData(encryptedTopicKeysObject: IEncryptedTopicKeysObject, encryptedTopicDataInBase64: string, privateKey: string): ITopicData {
    if (!encryptedTopicKeysObject.c) {
      throw new Error('Encrypted topic keys object does not have encapsulated symmetric keys. (Are you trying to use Kyber on a non-Kyber encrypted topic?)');
    }

    for (const encapsulatedSymmetricKey of encryptedTopicKeysObject.c) {
      const symmetricKey = this.decryptEncapsulatedSymmetricKey(encapsulatedSymmetricKey, privateKey);
      const initVector = this.getInitVectorFromSymmetricKeyNumberArray(symmetricKey);

      for (const encryptedTopicKey of encryptedTopicKeysObject.a) {
        for (const encryptedTopicInitVector of encryptedTopicKeysObject.b) {
          let topicEncryptionKey;
          let topicEncryptionInitVector;

          try {
            topicEncryptionKey = this.symmetricDecrypt(encryptedTopicKey, symmetricKey, initVector);
            topicEncryptionInitVector = this.symmetricDecrypt(encryptedTopicInitVector, symmetricKey, initVector);
          } catch (error) {
            continue;
          }

          try {
            const decryptedTopicConfigurationObject = this.symmetricDecrypt(encryptedTopicDataInBase64, Buffer.from(topicEncryptionKey, 'base64'), Buffer.from(topicEncryptionInitVector, 'base64'));

            return JSON.parse(decryptedTopicConfigurationObject) as ITopicData;
          } catch (error) {
          }
        }
      }
    }

    throw new Error('Error fetching topic data. Does user have access?');
  }

  public getTopicEncryptionKeyAndInitVector(encryptedTopicKeysObject: IEncryptedTopicKeysObject, privateKey: string): ITopicEncryptionKeyAndInitVector {
    if (!encryptedTopicKeysObject.c) {
      throw new Error('Encrypted topic keys object does not have encapsulated symmetric keys. (Are you trying to use Kyber on a non-Kyber encrypted topic?)');
    }

    for (const encapsulatedSymmetricKey of encryptedTopicKeysObject.c) {
      const symmetricKey = this.decryptEncapsulatedSymmetricKey(encapsulatedSymmetricKey, privateKey);
      const initVector = this.getInitVectorFromSymmetricKeyNumberArray(symmetricKey);

      for (const encryptedTopicKey of encryptedTopicKeysObject.a) {
        for (const encryptedTopicInitVector of encryptedTopicKeysObject.b) {
          let topicEncryptionKey;
          let topicEncryptionInitVector;

          try {
            topicEncryptionKey = this.symmetricDecrypt(encryptedTopicKey, symmetricKey, initVector);
            topicEncryptionInitVector = this.symmetricDecrypt(encryptedTopicInitVector, symmetricKey, initVector);
          } catch (error) {
            continue;
          }

          return {
            encryptionKey: topicEncryptionKey,
            initVector: topicEncryptionInitVector
          };
        }
      }
    }

    throw new Error('Error fetching topic encryption key and init vector. Does user have access?');
  }

  public validateParticipantKeys(topicParticipants: Array<string>, topicEncryptionKeySize: number): void {
    // base64-encoded Kyber keys are 1068, 1580 or 2092 characters in length
    const expectedKeyLengthInBase64 = (this.keySize * 2) + 44;

    for (const publicKey of topicParticipants) {
      if (publicKey.length !== expectedKeyLengthInBase64) {
        throw new Error(`Kyber public key ${publicKey} is of wrong size. Topic encryption algorithm key size is ${topicEncryptionKeySize}. (Is the key base64 encoded?)`);
      }
    }
  }

  private decryptEncapsulatedSymmetricKey(encapsulatedSymmetricKey: string, privateKey: string) {
    switch (this.keySize) {
      case 512:
        return kyber.Decrypt512(Buffer.from(encapsulatedSymmetricKey, 'base64'), Buffer.from(privateKey, 'base64'));
      case 768:
        return kyber.Decrypt768(Buffer.from(encapsulatedSymmetricKey, 'base64'), Buffer.from(privateKey, 'base64'));
      case 1024:
        return kyber.Decrypt1024(Buffer.from(encapsulatedSymmetricKey, 'base64'), Buffer.from(privateKey, 'base64'));
      default:
        throw new Error('Kyber adapter was initialized with wrong key size. Available sizes are 512, 768 and 1024.');
    }
  }

  private getSymmetricAndEncapsulatedKey(publicKey: Buffer): Array<Array<number>> {
    switch (this.keySize) {
      case 512:
        return kyber.Encrypt512(publicKey);
      case 768:
        return kyber.Encrypt768(publicKey);
      case 1024:
        return kyber.Encrypt1024(publicKey);
      default:
        throw new Error('Kyber adapter was initialized with wrong key size. Available sizes are 512, 768 and 1024.');
    }
  }

  private getInitVectorFromSymmetricKeyNumberArray(symmetricKey: Array<number>): Buffer {
    return Buffer.from(symmetricKey.filter((_, index) => index % 2 === 0));
  }
}
