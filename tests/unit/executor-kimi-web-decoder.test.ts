import { describe, it } from "node:test";
import assert from "node:assert";
import { frameConnectMessage, decodeConnectFrame } from "@omniroute/open-sse/executors/kimi-web.ts";
import { extractKimiAccessToken } from "@/lib/providers/webCookieAuth.ts";

describe("KimiWeb Connect-RPC framing", () => {
  it("frameConnectMessage produces valid 5-byte envelope + JSON", () => {
    const payload = { id: "test-id", mode: "chat", messages: [] };
    const frame = frameConnectMessage(payload);
    
    assert.ok(frame instanceof Uint8Array, "Frame should be Uint8Array");
    assert.ok(frame.length >= 5, "Frame should have at least 5 bytes");
    
    // First byte is compression flag (0 = no compression)
    assert.strictEqual(frame[0], 0, "Compression flag should be 0");
    
    // Next 4 bytes are big-endian length
    const view = new DataView(frame.buffer, 0);
    const length = view.getUint32(1, false);
    assert.ok(length > 0, "Length should be positive");
    assert.strictEqual(frame.length, 5 + length, "Frame length should match envelope + payload");
  });

  it("decodeConnectFrame extracts the original payload", () => {
    const payload = { id: "test-id", mode: "chat", messages: [{ role: "user", content: "Hello" }] };
    const frame = frameConnectMessage(payload);
    const decoded = decodeConnectFrame(frame);
    
    assert.ok(decoded, "Decoded should not be null");
    assert.deepStrictEqual(decoded, payload, "Decoded payload should match original");
  });

  it("decodeConnectFrame returns null for malformed frame", () => {
    const shortBuffer = new Uint8Array([0, 0, 0, 0]); // Only 4 bytes
    assert.strictEqual(decodeConnectFrame(shortBuffer), null, "Should return null for short buffer");
    
    const compressedBuffer = new Uint8Array([1, 0, 0, 0, 1, 123]); // Compression flag = 1
    assert.strictEqual(decodeConnectFrame(compressedBuffer), null, "Should return null for compressed frame");
  });
});

describe("extractKimiAccessToken", () => {
  it('extracts token from "bearer abc123"', () => {
    assert.strictEqual(extractKimiAccessToken("bearer abc123"), "abc123");
    assert.strictEqual(extractKimiAccessToken("Bearer abc123"), "abc123");
  });

  it('extracts token from "access_token=abc123; kimi-auth=xyz"', () => {
    assert.strictEqual(extractKimiAccessToken("access_token=abc123; kimi-auth=xyz"), "abc123");
  });

  it('extracts token from bare "abc123"', () => {
    assert.strictEqual(extractKimiAccessToken("abc123"), "abc123");
  });

  it("returns null for empty string", () => {
    assert.strictEqual(extractKimiAccessToken(""), null);
    assert.strictEqual(extractKimiAccessToken(null), null);
    assert.strictEqual(extractKimiAccessToken(undefined), null);
  });

  it('extracts from kimi-auth cookie', () => {
    assert.strictEqual(extractKimiAccessToken("kimi-auth=mytoken123"), "mytoken123");
  });

  it('extracts from kimi_token cookie', () => {
    assert.strictEqual(extractKimiAccessToken("kimi_token=anotherToken"), "anotherToken");
  });

  it('extracts from session cookie', () => {
    assert.strictEqual(extractKimiAccessToken("session=sessionVal"), "sessionVal");
  });
});
