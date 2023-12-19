import {Kyber} from "../../../../src/crypto/adapters/Kyber";
import * as crypto from 'crypto';
import {ITopicData} from "../../../../lib/hedera/interfaces/ITopicData";

describe("The Kyber crypto adapter", () => {
    describe("constructor", () => {
        test("should return a valid Kyber object for all sizes, even wrong ones", () => {
            expect(new Kyber(512)).toBeDefined();
            expect(new Kyber(768)).toBeDefined();
            expect(new Kyber(1024)).toBeDefined();

            expect(new Kyber(0)).toBeDefined();
        });
    });

    describe("generateKeyPair function", () => {
        test("should return a valid set of Kyber key pairs for all (valid) sizes", () => {
            const kyber512 = new Kyber(512);
            const keyPair512 = kyber512.generateKeyPair();

            expect(keyPair512).toBeDefined();
            expect(keyPair512.publicKey).toBeDefined();
            // base64-encoded Kyber keys are 1068, 1580 or 2092 characters in length
            expect(keyPair512.publicKey.length).toEqual((512*2) + 44);
            expect(keyPair512.privateKey).toBeDefined();

            const kyber768 = new Kyber(768);
            const keyPair768 = kyber768.generateKeyPair();

            expect(keyPair768).toBeDefined();
            expect(keyPair768.publicKey).toBeDefined();
            // base64-encoded Kyber keys are 1068, 1580 or 2092 characters in length
            expect(keyPair768.publicKey.length).toEqual((768*2) + 44);
            expect(keyPair768.privateKey).toBeDefined();

            const kyber1024 = new Kyber(1024);
            const keyPair1024 = kyber1024.generateKeyPair();

            expect(keyPair1024).toBeDefined();
            expect(keyPair1024.publicKey).toBeDefined();
            // base64-encoded Kyber keys are 1068, 1580 or 2092 characters in length
            expect(keyPair1024.publicKey.length).toEqual((1024*2) + 44);
            expect(keyPair1024.privateKey).toBeDefined();
        });

        test("should fail if the key size is not 512, 768 or 1024", () => {
            expect(() => { new Kyber(0).generateKeyPair() }).toThrowError('Kyber adapter was initialized with wrong key size. Available sizes are 512, 768 and 1024.');
        });
    });

    describe("validateParticipantKeys function", () => {
        test("should pass without failing when a valid key size is passed", () => {
            const kyber512 = new Kyber(512);
            const keyPair512 = kyber512.generateKeyPair();

            kyber512.validateParticipantKeys([keyPair512.publicKey], 512);
        });

        test("should fail when a wrong key size is passed", () => {
            const kyber512 = new Kyber(512);
            const keyPair512 = kyber512.generateKeyPair();

            const kyber768 = new Kyber(768);
            const func = () => {
                kyber768.validateParticipantKeys([keyPair512.publicKey], 512);
            };

            expect(func).toThrowError(`Kyber public key ${keyPair512.publicKey} is of wrong size. Topic encryption algorithm key size is 512. (Is the key base64 encoded?)`)
        });
    });

    describe("getEncryptedTopicKeysObject function", () => {
        test("should return the expected object with all valid key sizes", () => {
            const kyber512 = new Kyber(512);
            const keyPair512 = kyber512.generateKeyPair();
            let topicEncryptionKey = crypto.randomBytes(32);
            let topicInitVector = crypto.randomBytes(16);

            let result = kyber512.getEncryptedTopicKeysObject(topicEncryptionKey, topicInitVector, [keyPair512.publicKey]);

            const kyber768 = new Kyber(768);
            const keyPair768 = kyber768.generateKeyPair();
            topicEncryptionKey = crypto.randomBytes(32);
            topicInitVector = crypto.randomBytes(16);

            result = kyber768.getEncryptedTopicKeysObject(topicEncryptionKey, topicInitVector, [keyPair768.publicKey]);

            const kyber1024 = new Kyber(1024);
            const keyPair1024 = kyber1024.generateKeyPair();
            topicEncryptionKey = crypto.randomBytes(32);
            topicInitVector = crypto.randomBytes(16);

            result = kyber1024.getEncryptedTopicKeysObject(topicEncryptionKey, topicInitVector, [keyPair1024.publicKey]);
        });

        test("should fail when a wrong key size is passed", () => {
            const kyber = new Kyber(0);
            const kyber1024 = new Kyber(1024);
            const keyPair1024 = kyber1024.generateKeyPair();
            const topicEncryptionKey = crypto.randomBytes(32);
            const topicInitVector = crypto.randomBytes(16);

            const func = () => {
                kyber.getEncryptedTopicKeysObject(topicEncryptionKey, topicInitVector, [keyPair1024.publicKey]);
            };

            expect(func).toThrowError('Kyber adapter was initialized with wrong key size. Available sizes are 512, 768 and 1024.');
        });
    });

    describe("decryptTopicData function", () => {
        test("should return the expected object with all valid key sizes", () => {
            const kyber512 = new Kyber(512);
            const keyPair512 = kyber512.generateKeyPair();
            let topicEncryptionKey = crypto.randomBytes(32);
            let topicInitVector = crypto.randomBytes(16);

            const encryptedTopicKeysObject = kyber512.getEncryptedTopicKeysObject(topicEncryptionKey, topicInitVector, [keyPair512.publicKey]);

            const topicData: ITopicData = {
                s: '',
                m: {
                    a: 'b'
                }
            };

            const encryptedTopicDataInBase64 = kyber512.symmetricEncrypt(JSON.stringify(topicData), topicEncryptionKey, topicInitVector);
            const decryptedTopicData = kyber512.decryptTopicData(encryptedTopicKeysObject, encryptedTopicDataInBase64, keyPair512.privateKey);

            expect(JSON.stringify(decryptedTopicData)).toEqual(JSON.stringify(topicData));
        });

        test("should not start without the necessary parameters in the encrypted topic keys object", () => {
            const kyber512 = new Kyber(512);
            const keyPair512 = kyber512.generateKeyPair();
            let topicEncryptionKey = crypto.randomBytes(32);
            let topicInitVector = crypto.randomBytes(16);

            const encryptedTopicKeysObject = kyber512.getEncryptedTopicKeysObject(topicEncryptionKey, topicInitVector, [keyPair512.publicKey]);

            delete encryptedTopicKeysObject.c;

            const topicData: ITopicData = {
                s: '',
                m: {
                    a: 'b'
                }
            };

            const encryptedTopicDataInBase64 = kyber512.symmetricEncrypt(JSON.stringify(topicData), topicEncryptionKey, topicInitVector);
            const func = () => {
                kyber512.decryptTopicData(encryptedTopicKeysObject, encryptedTopicDataInBase64, keyPair512.privateKey);
            };

            expect(func).toThrowError('Encrypted topic keys object does not have encapsulated symmetric keys. (Are you trying to use Kyber on a non-Kyber encrypted topic?)');
        });

        test("should fail with the wrong private key", () => {
            const kyber512 = new Kyber(512);
            const keyPair512 = kyber512.generateKeyPair();
            const keyPair512Second = kyber512.generateKeyPair();
            let topicEncryptionKey = crypto.randomBytes(32);
            let topicInitVector = crypto.randomBytes(16);

            const encryptedTopicKeysObject = kyber512.getEncryptedTopicKeysObject(topicEncryptionKey, topicInitVector, [keyPair512.publicKey]);

            const topicData: ITopicData = {
                s: '',
                m: {
                    a: 'b'
                }
            };

            const encryptedTopicDataInBase64 = kyber512.symmetricEncrypt(JSON.stringify(topicData), topicEncryptionKey, topicInitVector);
            const func = () => {
                kyber512.decryptTopicData(encryptedTopicKeysObject, encryptedTopicDataInBase64, keyPair512Second.privateKey);
            };

            expect(func).toThrowError('Error fetching topic data. Does user have access?');
        });
    });

    describe("getTopicEncryptionKeyAndInitVector function", () => {
        test("should not start without the necessary parameters in the encrypted topic keys object", () => {
            const kyber512 = new Kyber(512);
            const keyPair512 = kyber512.generateKeyPair();
            let topicEncryptionKey = crypto.randomBytes(32);
            let topicInitVector = crypto.randomBytes(16);

            let encryptedTopicKeysObject = kyber512.getEncryptedTopicKeysObject(topicEncryptionKey, topicInitVector, [keyPair512.publicKey]);

            delete encryptedTopicKeysObject.c;

            const func = () => {
                kyber512.getTopicEncryptionKeyAndInitVector(encryptedTopicKeysObject, keyPair512.privateKey);
            };

            expect(func).toThrowError('Encrypted topic keys object does not have encapsulated symmetric keys. (Are you trying to use Kyber on a non-Kyber encrypted topic?)');
        });

        test("should fail when using the wrong private key", () => {
            const kyber512 = new Kyber(512);
            const keyPair512 = kyber512.generateKeyPair();
            const keyPair512Second = kyber512.generateKeyPair();
            let topicEncryptionKey = crypto.randomBytes(32);
            let topicInitVector = crypto.randomBytes(16);

            let encryptedTopicKeysObject = kyber512.getEncryptedTopicKeysObject(topicEncryptionKey, topicInitVector, [keyPair512.publicKey]);

            const func = () => {
                kyber512.getTopicEncryptionKeyAndInitVector(encryptedTopicKeysObject, keyPair512Second.privateKey);
            };

            expect(func).toThrowError('Error fetching topic encryption key and init vector. Does user have access?');
        });

        test("should return the expected objects with all valid key sizes", () => {
            const kyber512 = new Kyber(512);
            const keyPair512 = kyber512.generateKeyPair();
            let topicEncryptionKey = crypto.randomBytes(32);
            let topicInitVector = crypto.randomBytes(16);

            let encryptedTopicKeysObject = kyber512.getEncryptedTopicKeysObject(topicEncryptionKey, topicInitVector, [keyPair512.publicKey]);

            let topicEncryptionAndInitVector = kyber512.getTopicEncryptionKeyAndInitVector(encryptedTopicKeysObject, keyPair512.privateKey);
            expect(topicEncryptionAndInitVector.encryptionKey).toEqual(Buffer.from(topicEncryptionKey).toString('base64'));
            expect(topicEncryptionAndInitVector.initVector).toEqual(Buffer.from(topicInitVector).toString('base64'));

            const kyber768 = new Kyber(768);
            const keyPair768 = kyber768.generateKeyPair();

            encryptedTopicKeysObject = kyber768.getEncryptedTopicKeysObject(topicEncryptionKey, topicInitVector, [keyPair768.publicKey]);

            topicEncryptionAndInitVector = kyber768.getTopicEncryptionKeyAndInitVector(encryptedTopicKeysObject, keyPair768.privateKey);
            expect(topicEncryptionAndInitVector.encryptionKey).toEqual(Buffer.from(topicEncryptionKey).toString('base64'));
            expect(topicEncryptionAndInitVector.initVector).toEqual(Buffer.from(topicInitVector).toString('base64'));

            const kyber1024 = new Kyber(1024);
            const keyPair1024 = kyber1024.generateKeyPair();

            encryptedTopicKeysObject = kyber1024.getEncryptedTopicKeysObject(topicEncryptionKey, topicInitVector, [keyPair1024.publicKey]);

            topicEncryptionAndInitVector = kyber1024.getTopicEncryptionKeyAndInitVector(encryptedTopicKeysObject, keyPair1024.privateKey);
            expect(topicEncryptionAndInitVector.encryptionKey).toEqual(Buffer.from(topicEncryptionKey).toString('base64'));
            expect(topicEncryptionAndInitVector.initVector).toEqual(Buffer.from(topicInitVector).toString('base64'));
        });

        test("Should fail when a wrong key size is passed", () => {
            const kyber512 = new Kyber(512);
            const kyber = new Kyber(0);
            const keyPair512 = kyber512.generateKeyPair();
            let topicEncryptionKey = crypto.randomBytes(32);
            let topicInitVector = crypto.randomBytes(16);

            let encryptedTopicKeysObject = kyber512.getEncryptedTopicKeysObject(topicEncryptionKey, topicInitVector, [keyPair512.publicKey]);

            const func = () => {
                kyber.getTopicEncryptionKeyAndInitVector(encryptedTopicKeysObject, keyPair512.privateKey);
            };

            expect(func).toThrowError('Kyber adapter was initialized with wrong key size. Available sizes are 512, 768 and 1024.');
        });
    });
});
