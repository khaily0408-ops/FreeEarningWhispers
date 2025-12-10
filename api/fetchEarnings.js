// api/fetchEarnings.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: "API key not set in environment variables" });
  }

  try {
    const prompt = `
      Search for the most anticipated earnings reports for this week and next week.
      Find at least 15-20 major companies reporting.

      For each company, output in this strict format:
      DATA_ROW: YYYY-MM-DD | TICKER | COMPANY_NAME | SECTOR | TIME | IV
    `;

    const response = await fetch(
      "https://api.generativeai.googleapis.com/v1beta2/models/gemini-2.5-flash:generateText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GEMINI_API_KEY}`,
        },
        body: JSON.stringify({ prompt, maxOutputTokens: 500 }),
      }
    );

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.[0]?.text || "";
    res.status(200).json({ rawText: text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch earnings" });
  }
}
