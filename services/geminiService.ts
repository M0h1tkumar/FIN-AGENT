import { GoogleGenAI } from "@google/genai";
import { Transaction, AgentRole, AutoPilotPlan, PredictionResult } from '../types';

let userApiKey: string | null = localStorage.getItem('user_gemini_api_key');

export const setApiKey = (key: string) => {
    userApiKey = key;
    if (key) {
        localStorage.setItem('user_gemini_api_key', key);
    } else {
        localStorage.removeItem('user_gemini_api_key');
    }
};

const getClient = () => {
    // Priority: User Input -> Env Var
    const key = userApiKey || process.env.API_KEY; 
    if (!key) return null;
    return new GoogleGenAI({ apiKey: key });
};

// Use Gemini 3 Pro for complex reasoning tasks
const REASONING_MODEL = 'gemini-3-pro-preview';
// Use Gemini 2.5 Flash for high-speed, lower latency tasks
const FAST_MODEL = 'gemini-2.5-flash';

// --- MOCK DATA HELPERS FOR DEMO MODE ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const analyzeFailure = async (transaction: Transaction): Promise<string> => {
    const ai = getClient();
    if (!ai) {
        await delay(1500);
        return `## 🟡 DEMO MODE ANALYSIS
        
**Note:** Running in simulation mode (No API Key detected).

**Root Cause Analysis:**
The transaction failed with error code \`${transaction.failureReason}\`.
This typically indicates a mismatch between the entity data stored in the ERP and the details provided by the payment gateway.

**Recommended Actions:**
1.  **Verify Master Data:** Check vendor ID \`${transaction.vendorName}\` in SAP/Oracle.
2.  **Contact Vendor:** Request updated banking information via secure channel.
        `;
    }

    try {
        const prompt = `
        You are an expert Financial Auditor Agent powered by Gemini 3.
        Analyze the following failed transaction with high precision:
        
        Vendor: ${transaction.vendorName}
        Amount: ${transaction.amount} ${transaction.currency}
        Failure Reason: ${transaction.failureReason}
        
        Provide a concise technical analysis of why this failed and suggest 2 specific steps to rectify it. 
        Format the output as Markdown.
        `;

        const response = await ai.models.generateContent({
            model: REASONING_MODEL,
            contents: prompt,
            config: {
                systemInstruction: "You are a precise and professional financial auditor."
            }
        });

        return response.text || "Unable to generate analysis.";
    } catch (error) {
        console.error("Gemini Analysis Error:", error);
        return "Error connecting to Auditor Agent. Please check API configuration.";
    }
};

export const draftVendorEmail = async (transaction: Transaction): Promise<{subject: string, body: string}> => {
    const ai = getClient();
    if (!ai) {
        await delay(1000);
        return {
            subject: `Action Required: Payment Issue - Invoice ${transaction.invoiceId}`,
            body: `Dear ${transaction.vendorName} Team,\n\nWe attempted to process payment for Invoice ${transaction.invoiceId} on ${transaction.date}, but encountered the following error: "${transaction.failureReason}".\n\nCould you please verify your banking details on file? We are eager to resolve this immediately.\n\nBest regards,\nAccounts Payable (Demo)`
        };
    }

    try {
        const prompt = `
        You are a Vendor Liaison Agent.
        Draft a polite but firm professional email to the vendor regarding a transaction issue.
        
        Vendor: ${transaction.vendorName}
        Contact: ${transaction.vendorEmail}
        Invoice: ${transaction.invoiceId}
        Issue: ${transaction.failureReason}
        
        Return the response in JSON format with keys "subject" and "body".
        `;

        const response = await ai.models.generateContent({
            model: FAST_MODEL, // Flash is sufficient and faster for drafting
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.text || "{}";
        return JSON.parse(text);
    } catch (error) {
        console.error("Gemini Email Draft Error:", error);
        return { subject: "Error", body: "Could not draft email." };
    }
};

export const validateRectification = async (transaction: Transaction, adjustmentDetails: string): Promise<string> => {
    const ai = getClient();
    if (!ai) {
        await delay(1000);
        return "APPROVED: (Demo) The proposed adjustment aligns with standard operating procedures for this error type.";
    }

    try {
        const prompt = `
        You are a Financial Controller Agent (Gemini 3).
        A user is attempting to rectify a failed transaction.
        
        Transaction: ${transaction.id} (${transaction.failureReason})
        Proposed Adjustment: ${adjustmentDetails}
        
        Evaluate if this adjustment seems reasonable to resolve the failure reason.
        Answer with "APPROVED" or "REJECTED" followed by a one sentence explanation.
        `;

         const response = await ai.models.generateContent({
            model: REASONING_MODEL, // Validation needs high accuracy
            contents: prompt,
        });

        return response.text || "Validation failed.";
    } catch (error) {
         console.error("Gemini Validation Error:", error);
         return "Error validating rectification.";
    }
}

export const askTransactionQuestion = async (transaction: Transaction, question: string): Promise<string> => {
    const ai = getClient();
    if (!ai) {
        await delay(800);
        return "I am currently running in **Demo Mode** because no API Key was provided. \n\nPlease configure your Google Gemini API Key in the settings (gear icon) to enable live chat capabilities.";
    }

    try {
        const prompt = `
        You are a helpful Financial Assistant.
        Context: The user is looking at a specific transaction record.
        
        Transaction Details:
        ID: ${transaction.id}
        Vendor: ${transaction.vendorName}
        Amount: ${transaction.amount} ${transaction.currency}
        Date: ${transaction.date}
        Status: ${transaction.status}
        Issue: ${transaction.failureReason || 'None'}
        
        User Question: "${question}"
        
        Answer concisely and professionally based on the transaction details provided.
        `;

        const response = await ai.models.generateContent({
            model: FAST_MODEL, // Chat should be snappy
            contents: prompt,
        });

        return response.text || "I couldn't process that question.";
    } catch (error) {
        console.error("Gemini Chat Error:", error);
        return "I'm having trouble connecting to the service right now.";
    }
};

// --- AGENTIC AI & ML FEATURES ---

export const predictResolutionLikelihood = async (transaction: Transaction): Promise<PredictionResult> => {
    const ai = getClient();
    if (!ai) {
        return { 
            score: 85, 
            label: 'High', 
            rationale: '(Demo) High confidence based on historical resolution of similar routing errors.' 
        };
    }

    try {
        const prompt = `
        Act as a Machine Learning Model specialized in financial risk.
        Predict the likelihood (0-100) of successfully resolving this transaction failure without human intervention.
        
        Failure Reason: ${transaction.failureReason}
        Vendor: ${transaction.vendorName}
        
        Return JSON: { "score": number, "label": "High" | "Medium" | "Low", "rationale": "short string" }
        `;

        const response = await ai.models.generateContent({
            model: FAST_MODEL,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        
        return JSON.parse(response.text || '{}');
    } catch (e) {
        return { score: 50, label: 'Medium', rationale: 'Estimation unavailable' };
    }
}

export const generateAutoPilotPlan = async (transaction: Transaction): Promise<AutoPilotPlan> => {
    const ai = getClient();
    if (!ai) {
        return {
            reasoning: "(Demo) The system has identified a high-probability resolution path involving vendor outreach and data verification.",
            steps: [
                { action: 'ANALYZE', description: 'Cross-referencing failure code with vendor master data (Simulated)' },
                { action: 'EMAIL_VENDOR', description: 'Generating automated inquiry for updated banking details (Simulated)' },
                { action: 'RECTIFY', description: 'Flagging transaction for manual review pending vendor response (Simulated)' }
            ]
        };
    }

    try {
        const prompt = `
        You are an Autonomous Financial Agent powered by Gemini 3.
        Create a strategic execution plan to resolve this failed transaction.
        
        Transaction: ${transaction.id}
        Reason: ${transaction.failureReason}
        
        Return JSON:
        {
            "reasoning": "A sophisticated explanation of the strategy being employed to resolve this specific error type.",
            "steps": [
                { "action": "ANALYZE" | "EMAIL_VENDOR" | "RECTIFY", "description": "Professional description of the step" }
            ]
        }
        `;

        const response = await ai.models.generateContent({
            model: REASONING_MODEL, // Planning requires the best model
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        
        return JSON.parse(response.text || '{}');
    } catch (e) {
        return { steps: [], reasoning: "Failed to generate plan" };
    }
}