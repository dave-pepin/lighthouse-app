import { describe, it, expect, vi, beforeEach } from "vitest";
import { dispatchWeeklyUpdate } from "./weeklyUpdateSend";
import { sendUpdateEmail, sendUpdateSms } from "./notify";

vi.mock("./notify", () => ({
  sendUpdateEmail: vi.fn(),
  sendUpdateSms: vi.fn(),
}));

function makeJourney(overrides = {}) {
  return {
    update_preference: "both",
    client_email: "client@example.com",
    client_email_2: null,
    client_phone: "+15550001111",
    client_phone_2: null,
    users: { full_name: "Jane Agent", sms_phone_number: "+15559998888", reply_to_email: "jane@agency.com" },
    ...overrides,
  };
}

const update = { draft_text: "Your inspection is scheduled for Friday." };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("dispatchWeeklyUpdate", () => {
  it("sends only email when preference is email", async () => {
    const errors = await dispatchWeeklyUpdate(update, makeJourney({ update_preference: "email" }));

    expect(errors).toEqual([]);
    expect(sendUpdateEmail).toHaveBeenCalledTimes(1);
    expect(sendUpdateEmail).toHaveBeenCalledWith({
      to: ["client@example.com"],
      agentName: "Jane Agent",
      message: update.draft_text,
      replyToEmail: "jane@agency.com",
    });
    expect(sendUpdateSms).not.toHaveBeenCalled();
  });

  it("sends only sms when preference is sms", async () => {
    const errors = await dispatchWeeklyUpdate(update, makeJourney({ update_preference: "sms" }));

    expect(errors).toEqual([]);
    expect(sendUpdateSms).toHaveBeenCalledTimes(1);
    expect(sendUpdateSms).toHaveBeenCalledWith({
      to: "+15550001111",
      message: update.draft_text,
      fromNumber: "+15559998888",
    });
    expect(sendUpdateEmail).not.toHaveBeenCalled();
  });

  it("sends both channels when preference is both", async () => {
    await dispatchWeeklyUpdate(update, makeJourney({ update_preference: "both" }));

    expect(sendUpdateEmail).toHaveBeenCalledTimes(1);
    expect(sendUpdateSms).toHaveBeenCalledTimes(1);
  });

  it("sends to a second phone/email when present, one SMS call per number", async () => {
    const journey = makeJourney({
      update_preference: "both",
      client_email_2: "client2@example.com",
      client_phone_2: "+15552223333",
    });

    await dispatchWeeklyUpdate(update, journey);

    expect(sendUpdateEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: ["client@example.com", "client2@example.com"] })
    );
    expect(sendUpdateSms).toHaveBeenCalledTimes(2);
  });

  it("sends nothing for an unrecognized preference", async () => {
    const errors = await dispatchWeeklyUpdate(update, makeJourney({ update_preference: "carrier_pigeon" }));

    expect(errors).toEqual([]);
    expect(sendUpdateEmail).not.toHaveBeenCalled();
    expect(sendUpdateSms).not.toHaveBeenCalled();
  });

  it("falls back to the shared number/no reply-to when the agent hasn't set their own", async () => {
    const journey = makeJourney({
      update_preference: "both",
      users: { full_name: null, sms_phone_number: null, reply_to_email: null },
    });

    await dispatchWeeklyUpdate(update, journey);

    expect(sendUpdateEmail).toHaveBeenCalledWith(
      expect.objectContaining({ agentName: "Your agent", replyToEmail: null })
    );
    expect(sendUpdateSms).toHaveBeenCalledWith(expect.objectContaining({ fromNumber: null }));
  });

  it("collects an email failure as an error instead of throwing, and still attempts SMS", async () => {
    sendUpdateEmail.mockRejectedValueOnce(new Error("Email failed: domain not verified"));

    const errors = await dispatchWeeklyUpdate(update, makeJourney({ update_preference: "both" }));

    expect(errors).toEqual(["Email failed: domain not verified"]);
    expect(sendUpdateSms).toHaveBeenCalledTimes(1);
  });

  it("keeps trying the second phone number after the first one fails, collecting both errors", async () => {
    sendUpdateSms.mockRejectedValueOnce(new Error("Text failed: invalid number"));
    sendUpdateSms.mockRejectedValueOnce(new Error("Text failed: opted out"));

    const journey = makeJourney({ update_preference: "sms", client_phone_2: "+15552223333" });
    const errors = await dispatchWeeklyUpdate(update, journey);

    expect(sendUpdateSms).toHaveBeenCalledTimes(2);
    expect(errors).toEqual(["Text failed: invalid number", "Text failed: opted out"]);
  });
});
