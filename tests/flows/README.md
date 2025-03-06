# Flows testing

This folder contains a suite that tests different flows that can be carried out with the SDK, usually reflecting interactions among multiple parties.


You can run

`npm run test:flows`

from the root folder of the repository to run all the flows. This will take a while but will cover all cases.

Alternatively, if you want to run just one flow you can run

`npm run test:flows <flow_file_name>`

i.e.

`npm run test:flows Flow3.spec.ts`

## Flows

| File name                          | Flow name                                                                 | Description                                                                                                                                                                                        | Expect | Result                                                                                                            |
|------------------------------------|---------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------|-------------------------------------------------------------------------------------------------------------------|
| [Flow1.spec.ts](./Flow1.spec.ts)   | **Create encrypted topic with two participants**                          | A user tries to create a topic with two participants.                                                                                                                                              | ✅      | Topic is created, and topic Id is returned.                                                                       |
| [Flow2.spec.ts](./Flow2.spec.ts)   | **Submit message on encrypted topic with two participants**               | On an encrypted topic with two participants, they try to send and receive messages.                                                                                                                | ✅      | Both participants can send and receive the message.                                                                |  
| [Flow3.spec.ts](./Flow3.spec.ts)   | **Attempt to get message on encrypted topic as non-participant**          | On an encrypted topic with two participants and a message, an external participant tries to get and decrypt said message.                                                                          | ❌      | The external participant can't decrypt the message.                                                               |
| [Flow4.spec.ts](./Flow4.spec.ts)   | **Add another participant to an encrypted topic without forward secrecy** | On an encrypted topic with two participants and a message, the topic admin adds a third participant **without enforcing forward secrecy**.                                                         | ✅      | The third participant can decrypt the first message and send their own.                                           |
| [Flow5.spec.ts](./Flow5.spec.ts)   | **Add another participant to an encrypted topic with forward secrecy**    | On an encrypted topic with two participants and a message, the topic admin adds a third participant **enforcing forward secrecy**.                                                                 | ❌      | The third participant can't decrypt the first message.                                                            |
| [Flow6.spec.ts](./Flow6.spec.ts)   | **Add another participant to an encrypted topic with forward secrecy**    | On an encrypted topic with two participants and a message, the topic admin adds a third participant **enforcing forward secrecy**.                                                                 | ✅      | The first two participants can read the third participant's messages sent after they were added.                  |
| [Flow7.spec.ts](./Flow7.spec.ts)   | **Rotate a topic encryption key**                                         | On an encrypted topic with two participants and a message, the topic admin rotates its encryption key.                                                                                             | ✅      | Both participants can still read the first message and send more after the key rotation.                          |
| [Flow8.spec.ts](./Flow8.spec.ts)   | **Migrate topic configuration to use the File Service**                   | On an encrypted topic that uses the Consensus Service as the storage medium for the configuration message, the topic admin migrates said configuration to the File Service                         | ✅      | The topic configuration migration is successful and a new participant can be added now, who can see the messages. |
| [Flow9.spec.ts](./Flow9.spec.ts)   | **Store topic participants after topic creation**                         | On an encrypted topic that doesn't store the participants, the admin chooses to start doing so at some point and rotates the topic encryption key afterwards.                                      | ✅      | The participants are stored in a separate topic, and topic encryption key can be rotated after the fact.          |
| [Flow10.spec.ts](./Flow10.spec.ts) | **Store topic participants after topic creation**                         | On an encrypted topic that doesn't store the participants, the admin chooses to start doing so at some point but forgets to store one participant and rotates the topic encryption key afterwards. | ❌      | The forgotten participant can't receive messages after the topic encryption key rotation.                         |
