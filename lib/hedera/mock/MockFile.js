"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockFile = void 0;
class MockFile {
    constructor(contents) {
        if (contents) {
            this.contents = contents;
        }
        else {
            this.contents = '';
        }
        this.fileId = `0.0.${String(Math.floor(Math.random() * 500))}`;
    }
    getId() {
        return this.fileId;
    }
    getContents() {
        return this.contents;
    }
    append(contents) {
        this.contents += contents;
    }
}
exports.MockFile = MockFile;
//# sourceMappingURL=MockFile.js.map