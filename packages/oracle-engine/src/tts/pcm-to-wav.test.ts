import { describe, it, expect } from "vitest";
import { pcmBytesToWav } from "./pcm-to-wav";

function readString(view: DataView, offset: number, length: number): string {
  let str = "";
  for (let i = 0; i < length; i++) {
    str += String.fromCharCode(view.getUint8(offset + i));
  }
  return str;
}

describe("pcmBytesToWav", () => {
  it("encodes PCM bytes into a valid RIFF/WAV Blob with correct 44-byte header", async () => {
    const rawPcm = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
    const sampleRate = 24000;
    const blob = pcmBytesToWav(rawPcm, sampleRate);

    expect(blob.type).toBe("audio/wav");
    expect(blob.size).toBe(44 + rawPcm.byteLength);

    const arrayBuffer = await blob.arrayBuffer();
    const view = new DataView(arrayBuffer);

    expect(readString(view, 0, 4)).toBe("RIFF");
    expect(view.getUint32(4, true)).toBe(36 + rawPcm.byteLength);
    expect(readString(view, 8, 4)).toBe("WAVE");
    expect(readString(view, 12, 4)).toBe("fmt ");
    expect(view.getUint32(16, true)).toBe(16); // Subchunk1Size for PCM
    expect(view.getUint16(20, true)).toBe(1); // AudioFormat: 1 (PCM)
    expect(view.getUint16(22, true)).toBe(1); // Default numChannels: 1
    expect(view.getUint32(24, true)).toBe(sampleRate);
    expect(view.getUint32(28, true)).toBe(sampleRate * 1 * 2); // ByteRate
    expect(view.getUint16(32, true)).toBe(2); // BlockAlign
    expect(view.getUint16(34, true)).toBe(16); // BitsPerSample
    expect(readString(view, 36, 4)).toBe("data");
    expect(view.getUint32(40, true)).toBe(rawPcm.byteLength);

    // Payload verification
    const payload = new Uint8Array(arrayBuffer, 44);
    expect(Array.from(payload)).toEqual(Array.from(rawPcm));
  });

  it("supports stereo and custom sample rates", async () => {
    const rawPcm = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const sampleRate = 44100;
    const numChannels = 2;
    const bitsPerSample = 16;
    const blob = pcmBytesToWav(rawPcm, sampleRate, numChannels, bitsPerSample);

    const arrayBuffer = await blob.arrayBuffer();
    const view = new DataView(arrayBuffer);

    expect(view.getUint16(22, true)).toBe(numChannels);
    expect(view.getUint32(24, true)).toBe(sampleRate);
    expect(view.getUint32(28, true)).toBe(
      sampleRate * numChannels * (bitsPerSample / 8),
    );
    expect(view.getUint16(32, true)).toBe(numChannels * (bitsPerSample / 8));
    expect(view.getUint16(34, true)).toBe(bitsPerSample);
  });

  it("handles empty PCM input gracefully", async () => {
    const emptyPcm = new Uint8Array(0);
    const blob = pcmBytesToWav(emptyPcm, 16000);

    expect(blob.size).toBe(44);
    const arrayBuffer = await blob.arrayBuffer();
    const view = new DataView(arrayBuffer);

    expect(view.getUint32(4, true)).toBe(36);
    expect(view.getUint32(40, true)).toBe(0);
  });
});
