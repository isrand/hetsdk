export interface ITopicMemoObject {
    s: ITopicMemoStorageObject;
}
interface ITopicMemoStorageObject {
    c: ITopicMemoConfigurationStorageObject;
    m: ITopicMemoMessageStorageObject;
    p: ITopicMemoParticipantsStorageObject;
}
interface ITopicMemoConfigurationStorageObject {
    f: boolean;
    i?: string;
}
interface ITopicMemoMessageStorageObject {
    f: boolean;
}
interface ITopicMemoParticipantsStorageObject {
    p: boolean;
    i?: string;
}
export {};
