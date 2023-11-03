import {StorageOptions} from "../enums/StorageOptions";

export interface TopicStorageOptions {
    configuration: StorageOptions;
    messages: StorageOptions;
    storeParticipantsArray: boolean;
}
