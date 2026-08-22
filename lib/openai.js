// Minimal, dependency-free wrapper around OpenAI's Responses API, called
// directly over HTTP (same pattern used elsewhere in this app for the
// Supabase Admin Auth API) so we don't need to add an SDK dependency for
// one small feature.
//
// Note: an OpenAI API key is a separate thing from a ChatGPT Plus
// subscription — it's billed separately through platform.openai.com.

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
// GPT-5.6 Luna — OpenAI's model for cost-sensitive, high-volume workloads.
// Plenty for a short, casual weekly-update draft.
const MODEL = "gpt-5.6-luna";

export async function generateText({ system, prompt, maxTokens = 300 }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "AI suggestions aren't set up yet — add an OPENAI_API_KEY to your environment to turn this on."
    );
  }

  const res = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      instructions: system,
      input: prompt,
      max_output_tokens: maxTokens,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error?.message || "Couldn't reach the AI service.");
  }

  // The Responses API exposes a convenience `output_text` field for
  // simple text replies; fall back to walking the output array just in
  // case that's ever missing.
  let text = data?.output_text?.trim();
  if (!text && Array.isArray(data?.output)) {
    for (const item of data.output) {
      const chunk = item?.content?.find((c) => c?.type === "output_text")?.text;
      if (chunk) {
        text = chunk.trim();
        break;
      }
    }
  }

  if (!text) {
    throw new Error("Didn't get a suggestion back — try again.");
  }

  return text;
}
