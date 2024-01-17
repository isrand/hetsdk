import {MockFile} from "../../../src/hedera/mock/MockFile";

describe("The MockFile", () => {
    describe("constructor", () => {
        test("should return a valid MockFile object", () => {
            const mockFile = new MockFile();

            expect(mockFile).toBeDefined();
            expect(mockFile.getId()).toBeDefined();
        });

        test("should return a valid MockFile object with contents if these are passed", () => {
            const contents = 'test';
            const mockFile = new MockFile(contents);

            expect(mockFile).toBeDefined();
            expect(mockFile.getId()).toBeDefined();
            expect(mockFile.getContents()).toEqual(contents);
        });
    });

    describe("getContents function", () => {
        test("should return the contents of a file", () => {
            const contents = 'test';
            const mockFile = new MockFile(contents);

            expect(mockFile.getContents()).toEqual(contents);
        });
    });

    describe("append function", () => {
        test("should add new data at the end of the file contents", () => {
            const contents = 'test';
            const mockFile = new MockFile(contents);

            const moreContents = 'two'

            mockFile.append(moreContents);

            expect(mockFile.getContents()).toEqual(contents + moreContents);
        });
    });
});
