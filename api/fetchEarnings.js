import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key missing" });

  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
      Search for "most anticipated earnings reports" for current + next week.
      Include 15-20 major companies.
      Output strictly as:
      DATA_ROW: YYYY-MM-DD | TICKER | COMPANY_NAME | SECTOR | TIME | IV
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] }
    });

    const text = response.text || "";
    const lines = text.split('\n').filter(l => l.startsWith("DATA_ROW:"));
    
    const earnings = lines.map(line => {
      const parts = line.replace("DATA_ROW:", "").split("|").map(p => p.trim());
      return {
        date: parts[0],
        ticker: parts[1],
        companyName: parts[2],
        sector: parts[3],
        time: parts[4],
        iv: parts[5]
      };
    });

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate'); // cache 1 min
    res.status(200).json(earnings);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch earnings" });
  }
}
