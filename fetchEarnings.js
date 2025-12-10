import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("GEMINI_API_KEY is missing");

const parseEarningsText = (text) => {
  const reports = [];
  const lines = text.split('\n');
  const regex = /^DATA_ROW:\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)$/i;

  lines.forEach(line => {
    const match = line.trim().match(regex);
    if (match) {
      const [, dateStr, ticker, company, sector, timeStr, iv] = match;
      let time = 'Unknown';
      if (timeStr.toUpperCase().includes('BMO') || timeStr.toUpperCase().includes('BEFORE')) time = 'BMO';
      if (timeStr.toUpperCase().includes('AMC') || timeStr.toUpperCase().includes('AFTER')) time = 'AMC';

      reports.push({
        date: dateStr.trim(),
        ticker: ticker.trim().toUpperCase(),
        companyName: company.trim(),
        sector: sector.trim(),
        time,
        iv: iv.trim()
      });
    }
  });

  return reports;
};

(async () => {
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Search for "most anticipated earnings reports" for the current week and next week in the stock market.
    Include at least 15-20 major companies.
    Format each line strictly as:
    DATA_ROW: YYYY-MM-DD | TICKER | COMPANY_NAME | SECTOR | TIME | IV
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: { tools: [{ googleSearch: {} }] }
  });

  const text = response.text || "";
  const reports = parseEarningsText(text);

  fs.writeFileSync('public/earnings.json', JSON.stringify(reports, null, 2));
  console.log("✅ earnings.json updated!");
})();
