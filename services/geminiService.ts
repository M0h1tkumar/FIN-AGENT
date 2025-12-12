import { GoogleGenAI } from "@google/genai";
import { Transaction, AgentRole, AutoPilotPlan, PredictionResult } from '../types';

const getClient = () => {
    const apiKey = process.env.API_KEY || '';
    if (!apiKey) {
        console.warn("API Key not found in environment.");
    }
    return new GoogleGenAI({ apiKey });
};

export const analyzeFailure = async (transaction: Transaction): Promise<string> => {
    try {
        const ai = getClient();
        const model = 'gemini-2.5-flash';
        
        const prompt = `
        You are an expert Financial Auditor Agent.
        Analyze the following failed transaction:
        
        Vendor: ${transaction.vendorName}
        Amount: ${transaction.amount} ${transaction.currency}
        Failure Reason: ${transaction.failureReason}
        
        Provide a concise technical analysis of why this failed and suggest 2 specific steps to rectify it. 
        Format the output as Markdown.
        `;

        const response = await ai.models.generateContent({
            model,
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
    try {
        const ai = getClient();
        const model = 'gemini-2.5-flash';
        
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
            model,
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
    try {
        const ai = getClient();
        const model = 'gemini-2.5-flash';

        const prompt = `
        You are a Financial Controller Agent.
        A user is attempting to rectify a failed transaction.
        
        Transaction: ${transaction.id} (${transaction.failureReason})
        Proposed Adjustment: ${adjustmentDetails}
        
        Evaluate if this adjustment seems reasonable to resolve the failure reason.
        Answer with "APPROVED" or "REJECTED" followed by a one sentence explanation.
        `;

         const response = await ai.models.generateContent({
            model,
            contents: prompt,
        });

        return response.text || "Validation failed.";
    } catch (error) {
         console.error("Gemini Validation Error:", error);
         return "Error validating rectification.";
    }
}

export const askTransactionQuestion = async (transaction: Transaction, question: string): Promise<string> => {
    try {
        const ai = getClient();
        const model = 'gemini-2.5-flash';

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
            model,
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
    try {
        const ai = getClient();
        const model = 'gemini-2.5-flash';
        
        const prompt = `
        Act as a Machine Learning Model specialized in financial risk.
        Predict the likelihood (0-100) of successfully resolving this transaction failure without human intervention.
        
        Failure Reason: ${transaction.failureReason}
        Vendor: ${transaction.vendorName}
        
        Return JSON: { "score": number, "label": "High" | "Medium" | "Low", "rationale": "short string" }
        `;

        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        
        return JSON.parse(response.text || '{}');
    } catch (e) {
        return { score: 50, label: 'Medium', rationale: 'Estimation unavailable' };
    }
}

export const generateAutoPilotPlan = async (transaction: Transaction): Promise<AutoPilotPlan> => {
    try {
        const ai = getClient();
        const model = 'gemini-2.5-flash';
        
        const prompt = `
        You are an Autonomous Financial Agent.
        Create a 3-step execution plan to resolve this failed transaction.
        
        Transaction: ${transaction.id}
        Reason: ${transaction.failureReason}
        
        Return JSON:
        {
            "reasoning": "Brief explanation of strategy",
            "steps": [
                { "action": "ANALYZE" | "EMAIL_VENDOR" | "RECTIFY", "description": "Display text" }
            ]
        }
        `;

        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        
        return JSON.parse(response.text || '{}');
    } catch (e) {
        return { steps: [], reasoning: "Failed to generate plan" };
    }
}