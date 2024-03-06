/* eslint-disable id-length */

import {Client, PrivateKey} from '@hashgraph/sdk';
import {IEncryptedTopicConfiguration} from './hedera/interfaces/IEncryptedTopicConfiguration';
import {Long} from '@hashgraph/sdk/lib/long';
import {ITopicEncryptionKeyAndInitVector} from './hedera/interfaces/ITopicEncryptionKeyAndInitVector';
import {ICreateEncryptedTopicConfiguration} from './hedera/interfaces/ICreateEncryptedTopicConfiguration';
import {ITopicMemoObject} from './hedera/interfaces/ITopicMemoObject';
import {ITopicStorageOptions} from './hedera/interfaces/ITopicStorageOptions';
import {StorageOptions} from './hedera/enums/StorageOptions';
import {IEncryptedTopicKeysObject} from './crypto/interfaces/IEncryptedTopicKeysObject';
import {HederaStub} from './hedera/HederaStub';
import {EncryptionAlgorithms} from './crypto/enums/EncryptionAlgorithms';
import {IKeyPair} from './crypto/interfaces/IKeyPair';
import * as crypto from 'crypto';
import {TopicConfigurationMessageIndices} from './hedera/enums/TopicConfigurationMessageIndices';
import {ITopicData} from './hedera/interfaces/ITopicData';
import {ITopicConfigurationMessageParameters} from './hedera/interfaces/ITopicConfigurationMessageParameters';
import {IHederaStub} from './hedera/interfaces/IHederaStub';
import {RSA} from './crypto/adapters/RSA';
import {Kyber} from './crypto/adapters/Kyber';
import {ITopicEncryptedMessage} from './hedera/interfaces/ITopicEncryptedMessage';
import {ITopicConfigurationMessageObject} from './hedera/interfaces/ITopicConfigurationMessageObject';
import {Errors} from './errors/Errors';

export class EncryptedTopic {
  private readonly hederaStub: IHederaStub;

  private readonly privateKey: string;

  private crypto!: RSA | Kyber;

  /*
   * Hold a copy of the topic configuration message for further use,
   * so we don't have to get it from the Hedera network every single time.
   */
  private topicConfigurationMessage!: string;

  /*
   * Hold a copy of the topic memo object for further use,
   * so we don't have to get it from the Hedera network every single time.
   */
  private topicMemoObject!: ITopicMemoObject;

  /*
   * Set the topicId variable either on constructor (targeting already existing topic)
   * or upon topic creation for simplicity purposes
   */
  private topicId?: string;

  /*
   *
   *--- SDK PUBLIC METHODS ---
   *
   */

  public constructor(
    private readonly encryptedTopicConfiguration: IEncryptedTopicConfiguration,
    // Allow to pass an IHederaStub-compliant class from outside for test purposes
    private readonly stub?: IHederaStub
  ) {
    if (stub) {
      this.hederaStub = stub;
    } else {
      this.hederaStub = new HederaStub(
        Client.forTestnet().setOperator(
          encryptedTopicConfiguration.hederaAccountId,
          PrivateKey.fromString(encryptedTopicConfiguration.hederaPrivateKey)
        ),
        this.encryptedTopicConfiguration.hederaPrivateKey,
        this.encryptedTopicConfiguration.hederaAccountId
      );
    }

    this.privateKey = encryptedTopicConfiguration.privateKey;
    this.topicId = encryptedTopicConfiguration.topicId;
  }

  /*
   * "generateKeyPair" allows the user to create a public / private key pair should they not have one already,
   * with the algorithm and key size of their choosing, without the need to initialize the EncryptedTopic object
   */
  public static generateKeyPair(encryptionAlgorithm: EncryptionAlgorithms): IKeyPair {
    const algorithm = encryptionAlgorithm.split('-')[0];

    if (algorithm === 'rsa') {
      return new RSA().generateKeyPair();
    }

    const size = Number(encryptionAlgorithm.split('-')[1]);

    return new Kyber(size).generateKeyPair();
  }

  // "create" creates a new encrypted topic in the Hedera network
  public async create(createEncryptedTopicConfiguration: ICreateEncryptedTopicConfiguration): Promise<string> {
    const submitKey = PrivateKey.generateED25519().toStringRaw();
    const topicConfigurationMessageObject = this.createTopicConfigurationMessageObject({
      submitKey: submitKey,
      algorithm: createEncryptedTopicConfiguration.algorithm.split('-')[0],
      size: Number(createEncryptedTopicConfiguration.algorithm.split('-')[1]),
      participants: Array.from(new Set(createEncryptedTopicConfiguration.participants)),
      metadata: createEncryptedTopicConfiguration.metadata
    });
    this.topicConfigurationMessage = `${topicConfigurationMessageObject.topicConfigurationMessage}${topicConfigurationMessageObject.participantsEncryptedTopicKeys}`;
    const maxAllowedMessageSize = 20 * 1024;

    if (this.topicConfigurationMessage.length > maxAllowedMessageSize && createEncryptedTopicConfiguration.storageOptions.configuration === StorageOptions.Message) {
      throw new Error(Errors.TopicConfigurationMessageMaximumConsensusMessageSizeExceeded);
    }

    let fileId;

    if (createEncryptedTopicConfiguration.storageOptions.configuration === StorageOptions.File) {
      fileId = await this.hederaStub.createFile();

      await this.hederaStub.appendToFile(fileId, this.topicConfigurationMessage);
    }

    let participantsTopicId;

    if (createEncryptedTopicConfiguration.storageOptions.storeParticipants) {
      participantsTopicId = await this.createParticipantsTopic(submitKey, Array.from(new Set(createEncryptedTopicConfiguration.participants)));
    }

    this.topicMemoObject = this.createMemoObject(createEncryptedTopicConfiguration.storageOptions, participantsTopicId, fileId);
    this.topicId = await this.hederaStub.createTopic(submitKey, this.topicMemoObject);

    if (createEncryptedTopicConfiguration.storageOptions.configuration === StorageOptions.Message) {
      await this.hederaStub.submitMessageToTopic(submitKey, this.topicId, Buffer.from(this.topicConfigurationMessage).toString('base64'));
    }

    return this.topicId;
  }

  /*
   * "addParticipant" adds a new participant to the encrypted topic, and stores it in the participants topic if the
   * topic memo specifies
   */
  public async addParticipant(publicKey: string, forwardSecrecy?: boolean): Promise<boolean> {
    if (forwardSecrecy) {
      await this.rotateEncryptionKey();
    }

    await this.setMemo();
    await this.setConfigurationMessage();
    const algorithm = await this.getEncryptionAlgorithmFromConfigurationMessage();
    const size = await this.getEncryptionSizeFromConfigurationMessage();
    this.initializeCrypto(algorithm, size);

    if (!this.topicMemoObject.s.c.f) {
      throw new Error(Errors.AddParticipantToConsensusServiceTopic);
    }

    const currentConfigurationMessageVersion = await this.getCurrentTopicConfigurationMessageVersion();

    this.crypto.validateParticipantKeys([publicKey]);

    const topicEncryptionKeyAndInitVector = await this.getEncryptionKeyAndInitVector(currentConfigurationMessageVersion);

    const newEncryptedTopicEncryptionKeyAndInitVectors = this.crypto.getEncryptedTopicKeysObject(
      Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'),
      Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64'),
      [publicKey]
    );

    let newEncryptedTopicEncryptionKeyAndInitVectorsString = `${newEncryptedTopicEncryptionKeyAndInitVectors.a[0]}_${newEncryptedTopicEncryptionKeyAndInitVectors.b[0]}`;

    if (algorithm === 'kyber' && newEncryptedTopicEncryptionKeyAndInitVectors.c) {
      newEncryptedTopicEncryptionKeyAndInitVectorsString += `_${newEncryptedTopicEncryptionKeyAndInitVectors.c[0]}#`;
    }

    await this.hederaStub.appendToFile(this.topicMemoObject.s.c.i, newEncryptedTopicEncryptionKeyAndInitVectorsString);

    if (this.topicMemoObject.s.p.p) {
      const submitKey = await this.getSubmitKey(currentConfigurationMessageVersion);
      await this.hederaStub.submitMessageToTopic(submitKey, this.topicMemoObject.s.p.i, publicKey);
    }

    this.topicConfigurationMessage = this.topicConfigurationMessage + newEncryptedTopicEncryptionKeyAndInitVectorsString;

    return true;
  }

  /*
   * "submitMessage" submits a message on an encrypted topic (if the user has access)
   * and returns the sequence number of the message
   */
  public async submitMessage(message: string, medium: StorageOptions): Promise<number> {
    await this.setMemo();
    await this.setConfigurationMessage();

    const currentConfigurationMessageVersion = await this.getCurrentTopicConfigurationMessageVersion();

    const finalMessageInBase64 = await this.createTopicMessage(message, currentConfigurationMessageVersion);
    const maxAllowedMessageSize = 20 * 1024;

    if (finalMessageInBase64.length > maxAllowedMessageSize && medium === StorageOptions.Message) {
      throw new Error(Errors.MaximumMessageSizeExceededAfterEncryption);
    }

    const submitKey = await this.getSubmitKey(currentConfigurationMessageVersion);

    if (medium === StorageOptions.File) {
      const fileId = await this.hederaStub.createFile();
      await this.hederaStub.appendToFile(fileId, finalMessageInBase64);

      return this.hederaStub.submitMessageToTopic(submitKey, this.topicId, Buffer.from(fileId).toString('base64'));
    }

    return this.hederaStub.submitMessageToTopic(submitKey, this.topicId, finalMessageInBase64);
  }

  // "getMessage" gets a message from an encrypted topic (if the user has access)
  public async getMessage(sequenceNumber: number): Promise<string> {
    await this.setMemo();
    await this.setConfigurationMessage();

    const algorithm = await this.getEncryptionAlgorithmFromConfigurationMessage();
    const size = await this.getEncryptionSizeFromConfigurationMessage();
    this.initializeCrypto(algorithm, size);

    let encryptedMessageInBase64 = await this.getMessageFromTopic(sequenceNumber);

    while (this.isBase64Encoded(encryptedMessageInBase64)) {
      encryptedMessageInBase64 = Buffer.from(encryptedMessageInBase64, 'base64').toString('utf8');
    }

    let finalMessage = encryptedMessageInBase64;

    if (this.looksLikeFileId(encryptedMessageInBase64)) {
      finalMessage = await this.hederaStub.getFileContents(encryptedMessageInBase64);

      while (this.isBase64Encoded(finalMessage)) {
        finalMessage = Buffer.from(finalMessage, 'base64').toString('utf8');
      }
    }

    const encryptedMessage: ITopicEncryptedMessage = JSON.parse(finalMessage) as ITopicEncryptedMessage;
    const topicEncryptionKeyAndInitVector = await this.getEncryptionKeyAndInitVector(encryptedMessage.v);
    const decryptedMessageEncryptionKey = Buffer.from(this.crypto.symmetricDecrypt(encryptedMessage.k, Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'), Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64')), 'base64');
    const decryptedMessageInitVector = Buffer.from(this.crypto.symmetricDecrypt(encryptedMessage.i, Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'), Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64')), 'base64');

    return this.crypto.symmetricDecrypt(encryptedMessage.m, decryptedMessageEncryptionKey, decryptedMessageInitVector);
  }

  /*
   * "getParticipants" returns the list of participants that are part of the topic, if the encrypted
   * topic admin chose to store them upon creation
   */
  public async getParticipants(): Promise<Array<string>> {
    await this.setMemo();

    if (!this.topicMemoObject.s.p.p) {
      throw new Error(Errors.GetParticipantsFromTopicWithoutStoredParticipants);
    }

    const topicInfo = await this.hederaStub.getTopicInfo(this.topicMemoObject.s.p.i);
    const sequenceNumber = Number(topicInfo.sequenceNumber as Long);
    const participants = [];

    for (let i = 1; i <= sequenceNumber; i++) {
      const participant = await this.hederaStub.getMessageFromTopic(i, this.topicMemoObject.s.p.i);
      participants.push(Buffer.from(participant, 'base64').toString('utf8'));
    }

    return Array.from(new Set(participants));
  }

  /*
   * "rotateEncryptionKey" allows the topic administrator to rotate its encryption key and re-encrypt it with
   * every participant's public key, appending the new configuration message to the old one
   */
  public async rotateEncryptionKey(): Promise<void> {
    await this.setMemo();
    await this.setConfigurationMessage();

    if (!this.topicMemoObject.s.c.f) {
      throw new Error(Errors.RotateEncryptionKeyOnConsensusServiceTopic);
    }

    if (!this.topicMemoObject.s.p.p) {
      throw new Error(Errors.RotateEncryptionKeyOnTopicWithoutStoredParticipants);
    }

    const currentVersion = await this.getCurrentTopicConfigurationMessageVersion();
    const participants = await this.getParticipants();
    const topicData = await this.getTopicData(currentVersion);
    const algorithm = await this.getEncryptionAlgorithmFromConfigurationMessage();
    const size = await this.getEncryptionSizeFromConfigurationMessage();

    const newTopicConfigurationMessageObject = this.createTopicConfigurationMessageObject({
      submitKey: topicData.s,
      metadata: topicData.m,
      participants: participants,
      size: size,
      algorithm: algorithm
    });

    const newTopicConfigurationMessage = `${newTopicConfigurationMessageObject.topicConfigurationMessage}${newTopicConfigurationMessageObject.participantsEncryptedTopicKeys}`;
    const newTopicConfigurationString = `,${newTopicConfigurationMessage}`;

    await this.hederaStub.appendToFile(this.topicMemoObject.s.c.i, newTopicConfigurationString);
  }

  /*
   * "migrateConfigurationStorageMedium" allows the topic administrator to migrate a topic's configuration message storage medium
   * to use the File Service. This is useful when requirements change and the topic needs to grow beyond its original design.
   */
  public async migrateConfigurationStorageMedium(): Promise<void> {
    await this.setMemo();
    await this.setConfigurationMessage();

    if (this.topicMemoObject.s.c.f) {
      throw new Error(Errors.MigrateFileServiceTopicToFileServiceTopic);
    }

    const fileId = await this.hederaStub.createFile();
    await this.hederaStub.appendToFile(fileId, this.topicConfigurationMessage);

    const newTopicMemoObject: ITopicMemoObject = this.topicMemoObject;

    newTopicMemoObject.s.c.f = true;
    newTopicMemoObject.s.c.i = fileId;

    await this.hederaStub.updateTopicMemo(newTopicMemoObject, this.topicId);
  }

  /*
   * "storeParticipants" allows the topic administrator to create a participant storage topic after the encrypted topic was created.
   * It requires the old participants public keys to be passed as an argument, to ensure future topic encryption key rotations keep them into account.
   * Failing to pass all the public keys will lock these participants from effective participation in the future.
   */
  public async storeParticipants(oldParticipantsPublicKeys: Array<string>): Promise<string> {
    await this.setMemo();
    await this.setConfigurationMessage();

    if (this.topicMemoObject.s.p.p) {
      throw new Error(Errors.TopicParticipantsAlreadyStored);
    }

    const currentConfigurationMessageVersion = await this.getCurrentTopicConfigurationMessageVersion();
    const submitKey = await this.getSubmitKey(currentConfigurationMessageVersion);

    const participantsTopicId = await this.createParticipantsTopic(submitKey, oldParticipantsPublicKeys);

    const newTopicMemoObject: ITopicMemoObject = this.topicMemoObject;

    newTopicMemoObject.s.p.p = true;
    newTopicMemoObject.s.p.i = participantsTopicId;

    await this.hederaStub.updateTopicMemo(newTopicMemoObject, this.topicId);

    return participantsTopicId;
  }

  /*
   *
   *--- SDK INTERNAL METHODS ---
   *
   */

  private async createTopicMessage(message: string, currentConfigurationMessageVersion: number): Promise<string> {
    const topicEncryptionKeyAndInitVector = await this.getEncryptionKeyAndInitVector(currentConfigurationMessageVersion);

    const messageEncryptionKey: Buffer = Buffer.from(crypto.randomBytes(32));
    const messageEncryptionInitVector: Buffer = Buffer.from(crypto.randomBytes(16));

    const finalMessage = {
      m: this.crypto.symmetricEncrypt(message, messageEncryptionKey, messageEncryptionInitVector),
      k: this.crypto.symmetricEncrypt(Buffer.from(messageEncryptionKey).toString('base64'), Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'), Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64')),
      i: this.crypto.symmetricEncrypt(Buffer.from(messageEncryptionInitVector).toString('base64'), Buffer.from(topicEncryptionKeyAndInitVector.encryptionKey, 'base64'), Buffer.from(topicEncryptionKeyAndInitVector.initVector, 'base64')),
      v: currentConfigurationMessageVersion
    };

    return Buffer.from(JSON.stringify(finalMessage)).toString('base64');
  }

  private createTopicConfigurationMessageObject(topicConfigurationMessageParameters: ITopicConfigurationMessageParameters): ITopicConfigurationMessageObject {
    const algorithm = topicConfigurationMessageParameters.algorithm;
    const size = topicConfigurationMessageParameters.size;
    const participants = topicConfigurationMessageParameters.participants;
    const topicData = {s: topicConfigurationMessageParameters.submitKey, m: topicConfigurationMessageParameters.metadata};
    const topicEncryptionKey = Buffer.from(crypto.randomBytes(32));
    const topicEncryptionInitVector = Buffer.from(crypto.randomBytes(16));

    this.initializeCrypto(algorithm, size);
    this.crypto.validateParticipantKeys(participants);

    const encryptedTopicDataInBase64 = this.crypto.symmetricEncrypt(JSON.stringify(topicData), topicEncryptionKey, topicEncryptionInitVector);

    const topicConfigurationMessage = `${encryptedTopicDataInBase64}#${algorithm}#${size}#`;
    let participantsEncryptedTopicKeys = '';
    const encryptedTopicKeysObject = this.crypto.getEncryptedTopicKeysObject(topicEncryptionKey, topicEncryptionInitVector, participants);

    for (let i = 0; i < participants.length; i++) {
      let participantString = `${encryptedTopicKeysObject.a[i]}_${encryptedTopicKeysObject.b[i]}`;

      if (encryptedTopicKeysObject.c) {
        participantString += `_${encryptedTopicKeysObject.c[i]}`;
      }

      participantsEncryptedTopicKeys += `${participantString}#`;
    }

    return {
      topicConfigurationMessage: topicConfigurationMessage,
      participantsEncryptedTopicKeys: participantsEncryptedTopicKeys
    };
  }

  private looksLikeFileId(str: string): boolean {
    return str.includes('0.0.');
  }

  private createMemoObject(topicStorageOptions: ITopicStorageOptions, participantsTopicId?: string, topicConfigurationFileId?: string): ITopicMemoObject {
    return {
      s: {
        c: {
          i: topicConfigurationFileId || '',
          f: topicStorageOptions.configuration === StorageOptions.File
        },
        p: {
          p: topicStorageOptions.storeParticipants,
          i: participantsTopicId || ''
        }
      }
    };
  }

  private async getCurrentTopicConfigurationMessageVersion(): Promise<number> {
    await this.setConfigurationMessage();

    const currentTopicConfigurationMessage = this.topicConfigurationMessage.split(',').filter((elem) => {
      return elem !== '';
    });

    return currentTopicConfigurationMessage.length - 1;
  }

  private async createParticipantsTopic(submitKey: string, participants: Array<string>): Promise<string> {
    const topicId = await this.hederaStub.createTopic(submitKey);
    const uniqueParticipants = Array.from(new Set(participants));

    for (const publicKey of uniqueParticipants) {
      await this.hederaStub.submitMessageToTopic(submitKey, topicId, publicKey);
    }

    return topicId;
  }

  private async getEncryptionAlgorithmFromConfigurationMessage(): Promise<string> {
    await this.setConfigurationMessage();

    const currentTopicConfigurationMessage = this.topicConfigurationMessage.split(',').filter((elem) => {
      return elem !== '';
    });

    return currentTopicConfigurationMessage[currentTopicConfigurationMessage.length - 1].split('#')[TopicConfigurationMessageIndices.TopicEncryptionAlgorithmIndex];
  }

  private async getEncryptionSizeFromConfigurationMessage(): Promise<number> {
    await this.setConfigurationMessage();

    const currentTopicConfigurationMessage = this.topicConfigurationMessage.split(',').filter((elem) => {
      return elem !== '';
    });

    return Number(currentTopicConfigurationMessage[currentTopicConfigurationMessage.length - 1].split('#')[TopicConfigurationMessageIndices.TopicEncryptionSizeIndex]);
  }

  private async setMemo(): Promise<void> {
    const topicInfo = await this.hederaStub.getTopicInfo(this.topicId);

    this.topicMemoObject = JSON.parse(topicInfo.topicMemo) as ITopicMemoObject;
  }

  private async getEncryptionKeyAndInitVector(version: number): Promise<ITopicEncryptionKeyAndInitVector> {
    await this.setConfigurationMessage();
    const algorithm = await this.getEncryptionAlgorithmFromConfigurationMessage();
    const size = await this.getEncryptionSizeFromConfigurationMessage();
    this.initializeCrypto(algorithm, size);

    const encryptedTopicKeysObject = await this.getEncryptedTopicKeysObjectFromTopicConfigurationMessage(version);

    return this.crypto.getTopicEncryptionKeyAndInitVector(encryptedTopicKeysObject, this.privateKey);
  }

  private async setConfigurationMessage(): Promise<void> {
    await this.setMemo();
    let topicConfigurationMessage: string;

    // Topic memo specifies that topic configuration message is stored using the File Service
    if (this.topicMemoObject.s.c.f) {
      this.topicConfigurationMessage = await this.hederaStub.getFileContents(this.topicMemoObject.s.c.i);
      // Topic memo specifies that topic configuration message is stored using the Consensus Service
    } else {
      topicConfigurationMessage = await this.getMessageFromTopic(1);
      this.topicConfigurationMessage = Buffer.from(topicConfigurationMessage, 'base64').toString('utf8');
    }

    while (this.isBase64Encoded(this.topicConfigurationMessage)) {
      this.topicConfigurationMessage = Buffer.from(this.topicConfigurationMessage, 'base64').toString('utf8');
    }
  }

  private initializeCrypto(algorithm: string, size: number): void {
    if (algorithm === 'rsa') {
      this.crypto = new RSA();
    } else if (algorithm === 'kyber') {
      this.crypto = new Kyber(size);
    }
  }

  private async getTopicData(version: number): Promise<ITopicData> {
    await this.setConfigurationMessage();
    const algorithm = await this.getEncryptionAlgorithmFromConfigurationMessage();
    const size = await this.getEncryptionSizeFromConfigurationMessage();
    this.initializeCrypto(algorithm, size);

    const currentTopicConfigurationMessage = this.topicConfigurationMessage.split(',').filter((elem) => {
      return elem !== '';
    });

    const encryptedTopicDataInBase64 = currentTopicConfigurationMessage[version].split('#')[TopicConfigurationMessageIndices.TopicDataIndex];
    const encryptedTopicKeysObject = await this.getEncryptedTopicKeysObjectFromTopicConfigurationMessage(version);

    return this.crypto.decryptTopicData(encryptedTopicKeysObject, encryptedTopicDataInBase64, this.privateKey);
  }

  private async getSubmitKey(version: number): Promise<string> {
    const topicData = await this.getTopicData(version);

    return topicData.s;
  }

  private async getEncryptedTopicKeysObjectFromTopicConfigurationMessage(version: number): Promise<IEncryptedTopicKeysObject> {
    await this.setConfigurationMessage();

    const currentTopicConfigurationMessage = this.topicConfigurationMessage.split(',').filter((elem) => {
      return elem !== '';
    });

    const encryptedTopicKeysObjectArray = currentTopicConfigurationMessage[version].split('#').slice(TopicConfigurationMessageIndices.TopicEncryptedKeysIndex);
    const encryptedTopicKeysObject: IEncryptedTopicKeysObject = {
      a: [],
      b: []
    };

    const algorithm = await this.getEncryptionAlgorithmFromConfigurationMessage();

    if (algorithm === 'kyber') {
      encryptedTopicKeysObject.c = [];
    }

    for (const participant of encryptedTopicKeysObjectArray) {
      const participantEncryptionData = participant.split('_');

      if (participantEncryptionData[0]) {
        encryptedTopicKeysObject.a.push(participantEncryptionData[0]);
      }

      if (participantEncryptionData[1]) {
        encryptedTopicKeysObject.b.push(participantEncryptionData[1]);
      }

      if (encryptedTopicKeysObject.c && participantEncryptionData[2]) {
        encryptedTopicKeysObject.c.push(participantEncryptionData[2]);
      }
    }

    return encryptedTopicKeysObject;
  }

  private async getMessageFromTopic(sequenceNumber: number): Promise<string> {
    // First, check if topic has messages up to "sequenceNumber"
    const topicInfo = await this.hederaStub.getTopicInfo(this.topicId);

    if (Number(sequenceNumber) > Number(topicInfo.sequenceNumber as Long)) {
      throw new Error(Errors.TopicSequenceNumberLowerThanRequested);
    }

    return this.hederaStub.getMessageFromTopic(sequenceNumber, this.topicId);
  }

  private isBase64Encoded(str: string): boolean {
    try {
      return btoa(atob(str)) === str;
    } catch (error: unknown) {
      return false;
    }
  }
}
