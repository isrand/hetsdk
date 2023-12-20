export class MockFile {

    private contents: string;
    private readonly fileId: string;

    public constructor(
        contents?: string
    ) {
        if (contents) {
            this.contents = contents;
        } else {
            this.contents = '';
        }
        this.fileId = String(Math.floor(Math.random() * 500));
    }

    public getId() {
        return this.fileId;
    }

    public getContents(): string {
        return this.contents;
    }

    public append(contents: string) {
        this.contents += contents;
    }
}
