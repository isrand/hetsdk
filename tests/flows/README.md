# Flows testing

This folder contains a suite that tests different flows that can be carried out wtih the SDK, usually reflecting interactions among mutiple parties.

Since the SDK offers great granularity in its configuration (i.e. different encryption algorithms + various storage options) most tests utilise a standard configuration unless the flow requires a specific one:

```
algorithm: EncryptionAlgorithms.Kyber512,
storageOptions: {
    storeParticipants: false,
    configuration: StorageOptions.File,
    messages: StorageOptions.Message
}
```
## Running the tests

You can run

`npm run test:flows`

from the root folder of the repository to run all the flows. This will take a while but will cover all cases.

Alternatively, if you want to run just one flow you can run

`npm run test:flows <flow_name>`

i.e.

`npm run test:flows Flow3`

## Flows

| File name                        | Flow name                                                   | Description                                                                                                                                                 |
|----------------------------------|-------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [Flow1.spec.ts](./Flow1.spec.ts) | **Create encrypted topic with two participants**            | This flow tests that a topic with two participants can be created. It expects to receive the topic Id after creation.                                       |
| [Flow2.spec.ts](./Flow2.spec.ts) | **Submit message on encrypted topic with two participants** | This flow creates an encrypted topic with two participants, and has both participants send a message, expecting them both to be able to see both messages.  |
| [Flow3.spec.ts](./Flow3.spec.ts) | **Attempt to get message on encrypted topic as external**   | This flow takes an encrypted topic with two participants who sent a message, and attempts to get said message as an external party to the topic.            |
