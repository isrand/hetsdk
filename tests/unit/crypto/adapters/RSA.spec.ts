import {RSA} from "../../../../src/crypto/adapters/RSA";
import * as crypto from 'crypto';
import {ITopicData} from "../../../../src/hedera/interfaces/ITopicData";

describe("The RSA crypto adapter", () => {
    describe("constructor", () => {
        test("should return a valid RSA object for all sizes, even wrong ones", () => {
            expect(new RSA()).toBeDefined();
        });
    });

    describe("generateKeyPair function", () => {
        test("should return a valid RSA key pair", () => {
            const rsa = new RSA();
            const keyPair = rsa.generateKeyPair();
            // base64-encoded RSA public keys are 604 bytes in length
            const expectedKeyLengthInBase64 = 604;

            expect(keyPair).toBeDefined();
            expect(keyPair.publicKey).toBeDefined();
            expect(keyPair.publicKey.length).toEqual(expectedKeyLengthInBase64);
            expect(keyPair.privateKey).toBeDefined();
        });
    });

    describe("validateParticipantKeys function", () => {
        test("should pass without failing when a valid key size is passed", () => {
            const rsa = new RSA();
            const keyPair = rsa.generateKeyPair();

            rsa.validateParticipantKeys([keyPair.publicKey], 512);
        });

        test("should fail when a wrong key size is passed", () => {
            const rsa = new RSA();
            const keyPair = rsa.generateKeyPair();
            keyPair.publicKey += 'wrong_data_end_of_key'

            const func = () => {
                rsa.validateParticipantKeys([keyPair.publicKey], 2048);
            };

            expect(func).toThrowError(`RSA public key ${keyPair.publicKey} is of wrong size. Topic encryption algorithm key size is 2048. (Is the key base64 encoded?)`)
        });
    });

    describe("getEncryptedTopicKeysObject function", () => {
        test("should return the expected object", () => {
            const rsa = new RSA();
            const keyPair = rsa.generateKeyPair();
            let topicEncryptionKey = crypto.randomBytes(32);
            let topicInitVector = crypto.randomBytes(16);

            let result = rsa.getEncryptedTopicKeysObject(topicEncryptionKey, topicInitVector, [keyPair.publicKey]);
            expect(result.a).toBeDefined();
            expect(result.a).toHaveLength(1);
            expect(result.b).toBeDefined();
            expect(result.b).toHaveLength(1);
        });
    });

    describe("decryptTopicData function", () => {
        test("should return the expected object", () => {
            const rsa = new RSA();
            const keyPair = rsa.generateKeyPair();
            const keyPairSecond = rsa.generateKeyPair();
            let topicEncryptionKey = crypto.randomBytes(32);
            let topicInitVector = crypto.randomBytes(16);

            const encryptedTopicKeysObject = rsa.getEncryptedTopicKeysObject(topicEncryptionKey, topicInitVector, [keyPair.publicKey, keyPairSecond.publicKey]);

            const topicData: ITopicData = {
                s: '',
                m: {
                    a: 'b'
                }
            };

            const encryptedTopicDataInBase64 = rsa.symmetricEncrypt(JSON.stringify(topicData), topicEncryptionKey, topicInitVector);
            const decryptedTopicData = rsa.decryptTopicData(encryptedTopicKeysObject, encryptedTopicDataInBase64, keyPair.privateKey);

            expect(JSON.stringify(decryptedTopicData)).toEqual(JSON.stringify(topicData));
        });

        test("should fail with the wrong private key", () => {
            const rsa = new RSA();
            const keyPair = rsa.generateKeyPair();
            const secondKeyPair = rsa.generateKeyPair();
            const thirdKeyPair = rsa.generateKeyPair();
            let topicEncryptionKey = crypto.randomBytes(32);
            let topicInitVector = crypto.randomBytes(16);

            const encryptedTopicKeysObject = rsa.getEncryptedTopicKeysObject(topicEncryptionKey, topicInitVector, [keyPair.publicKey, secondKeyPair.publicKey]);

            const topicData: ITopicData = {
                s: '',
                m: {
                    a: 'b'
                }
            };

            const encryptedTopicDataInBase64 = rsa.symmetricEncrypt(JSON.stringify(topicData), topicEncryptionKey, topicInitVector);
            const func = () => {
                rsa.decryptTopicData(encryptedTopicKeysObject, encryptedTopicDataInBase64, thirdKeyPair.privateKey);
            };

            expect(func).toThrowError('Error fetching topic data. Does user have access?');
        });

        test("should fail with the wrong topic encryption key and init vector", () => {
            const rsa = new RSA();
            const keyPair = rsa.generateKeyPair();
            const secondKeyPair = rsa.generateKeyPair();
            const thirdKeyPair = rsa.generateKeyPair();
            let topicEncryptionKey = crypto.randomBytes(32);
            let topicInitVector = crypto.randomBytes(16);
            let topicEncryptionKeyTwo = crypto.randomBytes(32);
            let topicInitVectorTwo = crypto.randomBytes(16);

            const topicData: ITopicData = {
                s: '',
                m: {
                    a: 'b'
                }
            };

            const encryptedTopicKeysObject = rsa.getEncryptedTopicKeysObject(topicEncryptionKeyTwo, topicInitVectorTwo, [keyPair.publicKey, secondKeyPair.publicKey]);

            const encryptedTopicDataInBase64 = rsa.symmetricEncrypt(JSON.stringify(topicData), topicEncryptionKey, topicInitVector);
            const func = () => {
                rsa.decryptTopicData(encryptedTopicKeysObject, encryptedTopicDataInBase64, thirdKeyPair.privateKey);
            };

            expect(func).toThrowError('Error fetching topic data. Does user have access?');
        });
    });

    describe("getTopicEncryptionKeyAndInitVector function", () => {
        test("should fail when using the wrong private key", () => {
            const rsa = new RSA();
            const keyPair = rsa.generateKeyPair();
            const keyPairSecond = rsa.generateKeyPair();
            let topicEncryptionKey = crypto.randomBytes(32);
            let topicInitVector = crypto.randomBytes(16);

            let encryptedTopicKeysObject = rsa.getEncryptedTopicKeysObject(topicEncryptionKey, topicInitVector, [keyPair.publicKey]);

            const func = () => {
                rsa.getTopicEncryptionKeyAndInitVector(encryptedTopicKeysObject, keyPairSecond.privateKey);
            };

            expect(func).toThrowError('Error fetching topic encryption key and init vector. Does user have access?');
        });

        test("should return the expected objects with all valid key sizes", () => {
            const rsa = new RSA();
            const keyPair = rsa.generateKeyPair();
            let topicEncryptionKey = crypto.randomBytes(32);
            let topicInitVector = crypto.randomBytes(16);

            let encryptedTopicKeysObject = rsa.getEncryptedTopicKeysObject(topicEncryptionKey, topicInitVector, [keyPair.publicKey]);

            let topicEncryptionAndInitVector = rsa.getTopicEncryptionKeyAndInitVector(encryptedTopicKeysObject, keyPair.privateKey);
            expect(topicEncryptionAndInitVector.encryptionKey).toEqual(Buffer.from(topicEncryptionKey).toString('base64'));
            expect(topicEncryptionAndInitVector.initVector).toEqual(Buffer.from(topicInitVector).toString('base64'));
        });
    });
});
