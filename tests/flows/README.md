# Flows testing

This folder contains a suite that tests different flows that can be carried out with the SDK, usually reflecting interactions among multiple parties.

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

| File name                        | Flow name                                                                 | Description                                                                                                                                | Expect | Result                                                                                             |
|----------------------------------|---------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------|--------|----------------------------------------------------------------------------------------------------|
| [Flow1.spec.ts](./Flow1.spec.ts) | **Create encrypted topic with two participants**                          | A user tries a topic with two participants.                                                                                                | ✅      | Topic is created, and topic Id is returned.                                                        |
| [Flow2.spec.ts](./Flow2.spec.ts) | **Submit message on encrypted topic with two participants**               | On an encrypted topic with two participants, they try to send and receive messages.                                                        | ✅      | Both participants can get and receive the message.                                                 |  
| [Flow3.spec.ts](./Flow3.spec.ts) | **Attempt to get message on encrypted topic as non-participant**          | On an encrypted topic with two participants and a message, an external participant tries to get and decrypt said message.                  | ❌      | The external participant can't decrypt the message.                                                |
| [Flow4.spec.ts](./Flow4.spec.ts) | **Add another participant to an encrypted topic without forward secrecy** | On an encrypted topic with two participants and a message, the topic admin adds a third participant **without enforcing forward secrecy**. | ✅      | The third participant can decrypt the first message and send their own.                            |
| [Flow5.spec.ts](./Flow5.spec.ts) | **Add another participant to an encrypted topic with forward secrecy**    | On an encrypted topic with two participants and a message, the topic admin adds a third participant **enforcing forward secrecy**.         | ❌      | The third participant can't decrypt the first message.                                           |
| [Flow6.spec.ts](./Flow6.spec.ts) | **Add another participant to an encrypted topic with forward secrecy**    | On an encrypted topic with two participants and a message, the topic admin adds a third participant **enforcing forward secrecy**.         | ✅      | The first two participants can read the third participant's messages sent after they were added. |
