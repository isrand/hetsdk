import { StorageOption } from "../enums/StorageOption";
export interface TopicStorageOptions {
    configuration: StorageOption;
    messages: StorageOption;
    storeParticipantsArray: boolean;
}
