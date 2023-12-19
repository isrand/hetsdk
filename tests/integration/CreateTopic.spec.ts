import * as path from 'path';
import * as fs from 'fs';
import {EncryptedTopic} from "../../lib";
import {EncryptionAlgorithms} from "../../lib/crypto/enums/EncryptionAlgorithms";
import {StorageOptions} from "../../lib/hedera/enums/StorageOptions";

// Run tests locally
if (process.env.NODE_ENV !== 'CI') {
    if (!fs.existsSync(path.resolve(__dirname, '.env'))) {
        throw new Error('.env file not found, please provide one (follow the .env.template file)');
    }

   require('dotenv').config(
       { path: path.resolve(__dirname, '.env') }
   );
}

const hederaAccountId = String(process.env.HEDERA_ACCOUNT_ID);
const hederaPrivateKey = String(process.env.HEDERA_PRIVATE_KEY);

describe("The Encrypted Topic Creation", () => {
    test("should work and return an encrypted topic's Id", async () => {
        const userOne = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
        const userOneKyberPublicKey = userOne.publicKey;
        const userOneKyberPrivateKey = userOne.privateKey;

        const encryptedTopic = new EncryptedTopic({
            hederaAccountId: hederaAccountId,
            hederaPrivateKey: hederaPrivateKey,
            privateKey: userOneKyberPrivateKey,
        });

        const topicId = await encryptedTopic.create({
            participants: [userOneKyberPublicKey],
            algorithm: EncryptionAlgorithms.Kyber512,
            storageOptions: {
                storeParticipants: false,
                configuration: StorageOptions.File,
                messages: StorageOptions.Message
            },
            metadata: {
                name: "Supply Chain Logistics"
            },
        });

        await expect(topicId).toBeDefined();
    }, 20000);
});
