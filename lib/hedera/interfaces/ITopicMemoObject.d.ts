export interface ITopicMemoObject {
    s: ITopicMemoStorageObject;
}
interface ITopicMemoStorageObject {
    c: ITopicMemoConfigurationStorageObject;
    p: ITopicMemoParticipantsStorageObject;
}
interface ITopicMemoConfigurationStorageObject {
    f: boolean;
    i: string;
}
interface ITopicMemoParticipantsStorageObject {
    p: boolean;
    i: string;
}
export {};
