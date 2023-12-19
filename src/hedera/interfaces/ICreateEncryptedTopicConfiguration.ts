import {EncryptionAlgorithms} from "../../crypto/enums/EncryptionAlgorithms";
import {ITopicStorageOptions} from "./ITopicStorageOptions";

export interface ICreateEncryptedTopicConfiguration {
    participants: string[];
    algorithm: EncryptionAlgorithms;
    storageOptions: ITopicStorageOptions;
    metadata?: any;
}
