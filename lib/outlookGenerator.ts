import { OpenAI } from 'openai';

export const MODEL_PROVIDER = "google";
export const MODEL_VERSION = "gemini-2.5-flash";
export const PROMPT_VERSION = "ipo-outlook-v2";

export const SYSTEM_PROMPT = `You are an AI generating structured IPO Outlooks. 
You MUST ONLY use information explicitly supplied.
Do not infer.
Do not estimate missing company data.
Do not invent issue size, dates, industry, revenue, profits, debt, or management information.
If information is unavailable, return null.

Rules:
1. Return a structured JSON containing ONLY these keys:
   - "bearCase": { "min": number, "max": number, "probability": number (0-100) }
   - "baseCase": { "min": number, "max": number, "probability": number (0-100) }
   - "gmpCase": { "min": number, "max": number, "probability": number (0-100) }
   - "bullCase": { "min": number, "max": number, "probability": number (0-100) }
   - "confidenceScore": number (0 to 100)
   - "rationale": string

2. CRITICAL: The min/max numbers for each case must represent the "Expected Listing Premium/Discount Percentage" (e.g., 25 means a 25% listing gain, -10 means a 10% listing loss). DO NOT output absolute price percentages like 125%.
3. Set the "probability" for each case as a percentage number (0 to 100) based on how likely it is to occur given the fundamentals and current GMP trend. The sum of all 4 probabilities should ideally be around 100.
4. High confidence (80-100) requires complete fundamentals. Partial data = moderate confidence. Missing critical data = low confidence. Never assign high confidence solely because GMP is strong.
5. If a field like peRatio, ronw, etc. is null, do NOT invent it. Note its absence in your rationale.
6. Do NOT include investment advice, recommendations, buy signals, or ratings.
7. Return JSON only.`;

export function isValid(outlook: any, inputSnapshot: any) {
  if (outlook.confidenceScore < 0 || outlook.confidenceScore > 100) return false;
  if (outlook.bearCase.min > outlook.bearCase.max) return false;
  if (outlook.baseCase.min > outlook.baseCase.max) return false;
  if (outlook.gmpCase.min > outlook.gmpCase.max) return false;
  if (outlook.bullCase.min > outlook.bullCase.max) return false;
  
  if (!outlook.bearCase || !outlook.baseCase || !outlook.gmpCase || !outlook.bullCase || !outlook.rationale) return false;

  if (outlook.confidenceScore > 85) {
    let missingCount = 0;
    if (inputSnapshot.peRatio === null || inputSnapshot.peRatio === undefined) missingCount++;
    if (inputSnapshot.ronw === null || inputSnapshot.ronw === undefined) missingCount++;
    if (inputSnapshot.revenueGrowth === null || inputSnapshot.revenueGrowth === undefined) missingCount++;
    if (inputSnapshot.profitGrowth === null || inputSnapshot.profitGrowth === undefined) missingCount++;
    
    if (missingCount >= 2) {
      console.error("Validation failed: Overconfidence rejection rule triggered.");
      return false;
    }
  }

  return true;
}

export class OutlookGenerator {
  private activeClient: OpenAI;
  private primaryKey: string;
  private backupKey?: string;
  private usingBackupKey = false;

  constructor(primaryKey: string, backupKey?: string) {
    this.primaryKey = primaryKey;
    this.backupKey = backupKey;
    
    this.activeClient = new OpenAI({
      apiKey: this.primaryKey,
      baseURL: process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai",
    });
  }

  async generateOutlookPayload(ipoData: any, attempt = 0): Promise<any> {
    const prompt = `
IPO Name: ${ipoData.name}
Price Band: ${ipoData.priceBand}
GMP: ${ipoData.gmp}
Lot Size: ${ipoData.lotSize || 'Unknown'}
Min Investment: ${ipoData.minInvestment || 'Unknown'}
Issue Size: ${ipoData.issueSize ? ipoData.issueSize + ' Crores' : 'Unknown'}
Open Date: ${ipoData.openDate || 'Unknown'}
Listing Date: ${ipoData.listingDate || 'Unknown'}

Financial Metrics:
PE Ratio: ${ipoData.peRatio !== null ? ipoData.peRatio : 'null'}
RoNW: ${ipoData.ronw !== null ? ipoData.ronw + '%' : 'null'}
Debt to Equity: ${ipoData.debtToEquity !== null ? ipoData.debtToEquity : 'null'}
Revenue Growth: ${ipoData.revenueGrowth !== null ? ipoData.revenueGrowth + '%' : 'null'}
Profit Growth: ${ipoData.profitGrowth !== null ? ipoData.profitGrowth + '%' : 'null'}
`;

    try {
      const response = await this.activeClient.chat.completions.create({
        model: MODEL_VERSION,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });

      const raw = response.choices[0].message.content;
      if (!raw) throw new Error("Empty response from AI");
      return JSON.parse(raw);
    } catch (error: any) {
      if (!this.usingBackupKey && this.backupKey) {
        console.log(`Primary key failed (${error.status || error.message || 'unknown error'}). Switching to backup key...`);
        this.activeClient = new OpenAI({
          apiKey: this.backupKey,
          baseURL: process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai",
        });
        this.usingBackupKey = true;
        return await this.generateOutlookPayload(ipoData, attempt);
      }
      
      if (attempt >= 3) {
        throw new Error(`Max retries (3) exceeded. Last error: ${error.message}`);
      }
      
      if (error.status === 429 || (error.message && error.message.includes('429')) || error.status >= 500) {
        const backoffDelays = [60 * 1000, 180 * 1000, 5 * 60 * 1000];
        const delay = backoffDelays[attempt];
        console.log(`API Error. Waiting ${delay / 1000} seconds before retrying (Attempt ${attempt + 1})...`);
        await new Promise(res => setTimeout(res, delay));
        return await this.generateOutlookPayload(ipoData, attempt + 1);
      }
      
      throw error;
    }
  }
}
