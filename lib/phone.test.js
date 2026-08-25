import { describe, it, expect } from "vitest";
import { formatUSPhoneInput } from "./phone";

describe("formatUSPhoneInput", () => {
  it("returns an empty string for no digits", () => {
    expect(formatUSPhoneInput("")).toBe("");
    expect(formatUSPhoneInput(undefined)).toBe("");
  });

  it("adds only the opening paren for 1-3 digits", () => {
    expect(formatUSPhoneInput("7")).toBe("(7");
    expect(formatUSPhoneInput("712")).toBe("(712");
  });

  it("adds the closing paren and a space for 4-6 digits", () => {
    expect(formatUSPhoneInput("7126")).toBe("(712) 6");
    expect(formatUSPhoneInput("712635")).toBe("(712) 635");
  });

  it("adds the dash once past 6 digits", () => {
    expect(formatUSPhoneInput("7126355")).toBe("(712) 635-5");
  });

  it("formats a full 10-digit number", () => {
    expect(formatUSPhoneInput("7126355945")).toBe("(712) 635-5945");
  });

  it("strips non-digit characters from the input first", () => {
    expect(formatUSPhoneInput("712-635-5945")).toBe("(712) 635-5945");
    expect(formatUSPhoneInput("(712) 635-5945")).toBe("(712) 635-5945");
  });

  it("ignores anything past the 10th digit", () => {
    expect(formatUSPhoneInput("71263559451234")).toBe("(712) 635-5945");
  });
});
