import {EncryptionAlgorithms} from '../../crypto/enums/EncryptionAlgorithms';
import {ITopicStorageOptions} from './ITopicStorageOptions';

export interface ICreateEncryptedTopicConfiguration {
  participants: Array<string>;
  algorithm: EncryptionAlgorithms;
  storageOptions: ITopicStorageOptions;
  metadata?: unknown;
}
