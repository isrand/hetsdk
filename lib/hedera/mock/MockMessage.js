"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockMessage = void 0;
class MockMessage {
    constructor(cont) {
        this.contents = new Uint8Array(Buffer.from(cont));
    }
}
exports.MockMessage = MockMessage;
//# sourceMappingURL=MockMessage.js.map