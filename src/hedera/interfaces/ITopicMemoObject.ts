export interface ITopicMemoObject {
  // "s" is the storage options for the topic
  s: ITopicMemoStorageObject;
}

interface ITopicMemoStorageObject {
  // "c" is the key containing storage options for the topic configuration message
  c: ITopicMemoConfigurationStorageObject;

  // "p" is the key containing storage options for participants
  p: ITopicMemoParticipantsStorageObject;
}

interface ITopicMemoConfigurationStorageObject {
  // "f" is a boolean that indicates whether to use the File Service or not
  f: boolean;

  // "i" is the ID of the File where the topic configuration object is stored, if "u" is set to true
  i: string;
}

interface ITopicMemoParticipantsStorageObject {
  // "p" is a boolean that indicates whether to store the participants or not
  p: boolean;

  // "i" is the id of the Consensus Service topic where the participants are be stored
  i: string;
}
