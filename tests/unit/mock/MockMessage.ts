export class MockMessage {
    public contents: Uint8Array;

    public constructor(
        cont: string
    ) {
        this.contents = new Uint8Array(Buffer.from(cont));
    }
}
