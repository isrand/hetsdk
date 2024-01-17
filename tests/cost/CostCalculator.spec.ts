import {AccountBalanceQuery, Client, ExchangeRate, FileCreateTransaction, Hbar, PrivateKey} from "@hashgraph/sdk";
import {EnvironmentConfigurationResolver} from "../utils/EnvironmentConfigurationResolver";
import {EncryptedTopic} from "../../src";
import {EncryptionAlgorithms} from "../../src/crypto/enums/EncryptionAlgorithms";
import {HederaStubCostCalculator} from "../../src/hedera/calculator/HederaStubCostCalculator";
import {StorageOptions} from "../../src/hedera/enums/StorageOptions";

const configuration = new EnvironmentConfigurationResolver(String(process.env.NODE_ENV)).resolve();

const userOne = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
const userOneKyberPublicKey = userOne.publicKey;
const userOneKyberPrivateKey = userOne.privateKey;

const userTwo = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
const userTwoKyberPublicKey = userTwo.publicKey;
const userTwoKyberPrivateKey = userTwo.privateKey;

const userThree = EncryptedTopic.generateKeyPair(EncryptionAlgorithms.Kyber512);
const userThreeKyberPublicKey = userThree.publicKey;
const userThreeKyberPrivateKey = userThree.privateKey;

const hederaStubCostCalculator = new HederaStubCostCalculator();

const encryptedTopicWithoutCostCalculator = new EncryptedTopic({
    hederaAccountId: configuration.hederaAccountId,
    hederaPrivateKey: configuration.hederaPrivateKey,
    privateKey: userOneKyberPrivateKey,
});

const encryptedTopicWithCostCalculator = new EncryptedTopic({
    hederaAccountId: configuration.hederaAccountId,
    hederaPrivateKey: configuration.hederaPrivateKey,
    privateKey: userOneKyberPrivateKey,
}, hederaStubCostCalculator);

describe("The HederaStubCostCalculator", () => {
   test("should provide the approximate cost of a flow", async () => {
       const exchangeRateInCents = await getCurrentHederaNetworkExchangeRateInCents(configuration.hederaPrivateKey, configuration.hederaAccountId);
       const accountBalanceBeforeTest = await getHederaAcountBalance(configuration.hederaPrivateKey, configuration.hederaAccountId);

       await encryptedTopicWithoutCostCalculator.create({
           participants: [userOneKyberPublicKey],
           algorithm: EncryptionAlgorithms.Kyber512,
           storageOptions: {
               storeParticipants: true,
               configuration: StorageOptions.Message,
               messages: StorageOptions.Message
           },
           metadata: {
               name: "Supply Chain Logistics"
           },
       });

       await encryptedTopicWithCostCalculator.create({
           participants: [userOneKyberPublicKey],
           algorithm: EncryptionAlgorithms.Kyber512,
           storageOptions: {
               storeParticipants: true,
               configuration: StorageOptions.Message,
               messages: StorageOptions.Message
           },
           metadata: {
               name: "Supply Chain Logistics"
           },
       });

       // Demo flow with most of the functions from the SDK...
       const messageSequenceNumberWithoutCostCalculator = await encryptedTopicWithoutCostCalculator.submitMessage('test');
       const messageSequenceNumberWithCostCalculator = await encryptedTopicWithCostCalculator.submitMessage('test');

       await encryptedTopicWithoutCostCalculator.getMessage(messageSequenceNumberWithoutCostCalculator);
       await encryptedTopicWithCostCalculator.getMessage(messageSequenceNumberWithCostCalculator);

       await encryptedTopicWithoutCostCalculator.migrateConfigurationStorageMedium();
       await encryptedTopicWithCostCalculator.migrateConfigurationStorageMedium();

       await encryptedTopicWithoutCostCalculator.addParticipant(userTwoKyberPublicKey);
       await encryptedTopicWithCostCalculator.addParticipant(userTwoKyberPublicKey);

       await encryptedTopicWithoutCostCalculator.rotateEncryptionKey();
       await encryptedTopicWithCostCalculator.rotateEncryptionKey();

       await encryptedTopicWithoutCostCalculator.submitMessage('test');
       await encryptedTopicWithCostCalculator.submitMessage('test');

       await encryptedTopicWithoutCostCalculator.addParticipant(userThreeKyberPublicKey, true);
       await encryptedTopicWithCostCalculator.addParticipant(userThreeKyberPublicKey, true);

       const accountBalanceAfterTest = await getHederaAcountBalance(configuration.hederaPrivateKey, configuration.hederaAccountId);
       const realCost = accountBalanceBeforeTest - accountBalanceAfterTest; // This cost is in HBAR
       const realCostInCents = (realCost * exchangeRateInCents) / 100;

       const estimatedCost = hederaStubCostCalculator.getTotalCost();

       console.log(`Estimated cost during dry-run: ${estimatedCost.toFixed(4)}$`);
       console.log(`Real cost: ${realCostInCents.toFixed(4)}$`);

       const max = Math.max(realCostInCents, estimatedCost);
       const min = Math.min(realCostInCents, estimatedCost);

       const accuracyPercentage = (min / max) * 100;
       console.log(`SDK internal cost calculator returns ${accuracyPercentage.toFixed(4)}% of the real value.`);
   }, 2147483647);
});

// Test-specific helper function to get the real Hedera Account balance before and after an operation,
// to compare with the HederaStubCostCalculator class
async function getHederaAcountBalance(hederaPrivateKey: string, hederaAccountId: string): Promise<number> {
    const query = new AccountBalanceQuery({
        accountId: hederaAccountId
    });

    const client = Client.forTestnet().setOperator(hederaAccountId, PrivateKey.fromString(hederaPrivateKey));
    const accountBalance = await query.execute(client);

    return accountBalance.hbars.toBigNumber().toNumber();
}

// Test-specific dummy function that creates an empty file on the Hedera Network, just to parse the receipt of the transaction
// and extract the current exchange rate in cents
async function getCurrentHederaNetworkExchangeRateInCents(hederaPrivateKey: string, hederaAccountId: string): Promise<number> {
    const client = Client.forTestnet().setOperator(hederaAccountId, PrivateKey.fromString(hederaPrivateKey));

    const fileCreateTransaction: FileCreateTransaction = new FileCreateTransaction({
        keys: [PrivateKey.fromString(hederaPrivateKey).publicKey],
    }).setMaxTransactionFee(new Hbar(5));

    fileCreateTransaction.freezeWith(client);
    await fileCreateTransaction.sign(PrivateKey.fromString(hederaPrivateKey));

    const fileCreateTransactionResponse = await fileCreateTransaction.execute(client);
    const fileCreateTransactionReceipt = await fileCreateTransactionResponse.getReceipt(client);

    if (fileCreateTransactionReceipt.exchangeRate) {
        return fileCreateTransactionReceipt.exchangeRate.exchangeRateInCents
    }

    return 0;
}
