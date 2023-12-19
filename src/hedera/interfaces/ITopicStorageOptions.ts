import {StorageOptions} from "../enums/StorageOptions";

export interface ITopicStorageOptions {
    configuration: StorageOptions;
    messages: StorageOptions;
    storeParticipants: boolean;
}
