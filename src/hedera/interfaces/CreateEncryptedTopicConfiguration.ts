import {EncryptionAlgorithms} from "../../crypto/enums/EncryptionAlgorithms";
import {TopicStorageOptions} from "./TopicStorageOptions";

export interface CreateEncryptedTopicConfiguration {
    participants: string[];
    algorithm: EncryptionAlgorithms;
    storageOptions: TopicStorageOptions;
    metadata?: any;
}
