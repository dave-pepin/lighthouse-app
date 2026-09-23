import { describe, it, expect } from "vitest";
import { validateFile } from "./uploadValidation";

describe("validateFile", () => {
  it("returns null when the file is within limits", () => {
    const file = { size: 1024, type: "image/png" };
    expect(validateFile(file, { maxBytes: 5 * 1024 * 1024, allowedMimeTypes: ["image/png"] })).toBeNull();
  });

  it("rejects a file over the size limit", () => {
    const file = { size: 10 * 1024 * 1024, type: "image/png" };
    const error = validateFile(file, { maxBytes: 5 * 1024 * 1024, allowedMimeTypes: ["image/png"] });
    expect(error).toMatch(/too large/);
    expect(error).toMatch(/5MB/);
  });

  it("rejects a disallowed mime type", () => {
    const file = { size: 1024, type: "application/zip" };
    const error = validateFile(file, { maxBytes: 5 * 1024 * 1024, allowedMimeTypes: ["image/png"] });
    expect(error).toMatch(/not supported|isn't supported/);
  });

  it("uses the custom label in the size error", () => {
    const file = { size: 10 * 1024 * 1024, type: "video/mp4" };
    const error = validateFile(file, { maxBytes: 5 * 1024 * 1024, allowedMimeTypes: ["video/mp4"], label: "video" });
    expect(error).toMatch(/video is too large/);
  });

  it("skips the size check when maxBytes isn't provided", () => {
    const file = { size: 999 * 1024 * 1024, type: "image/png" };
    expect(validateFile(file, { allowedMimeTypes: ["image/png"] })).toBeNull();
  });

  it("skips the type check when allowedMimeTypes isn't provided", () => {
    const file = { size: 1024, type: "application/zip" };
    expect(validateFile(file, { maxBytes: 5 * 1024 * 1024 })).toBeNull();
  });
});
