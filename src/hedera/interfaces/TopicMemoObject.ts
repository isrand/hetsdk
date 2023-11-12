export interface TopicMemoObject {
    // "s" is the storage options for the topic
    s: TopicMemoStorageObject;
}

interface TopicMemoStorageObject {
    // "c" is the key containing storage options for the topic configuration message
    c: TopicMemoConfigurationStorageObject;

    // "m" is the key containing storage options for all topic messages
    m: TopicMemoMessageStorageObject;

    // "p" is the key containing storage options for participants
    p: TopicMemoParticipantsStorageObject
}

interface TopicMemoConfigurationStorageObject {
    // "f" is a boolean that indicates whether to use the File Service or not
    f: boolean;

    // "i" is the ID of the File where the topic configuration object is stored, if "u" is set to true
    i?: string;
}

interface TopicMemoMessageStorageObject {
    // "f" is a boolean that indicates whether to use the File Service or not
    f: boolean;
}

interface TopicMemoParticipantsStorageObject {
    // "p" is a boolean that indicates whether to store the participants or not
    p: boolean;

    // "i" is the id of the Consensus Service topic where the participants are be stored
    i?: string;
}
