
import { GoogleGenAI, Type, GenerateContentParameters } from "@google/genai";
import { ExamConfig, ExamData, ProgressCallback } from "../types";

const MODEL_PRIORITY = [
  "gemini-3-flash-preview",
  "gemini-3-pro-preview",
  "gemini-2.5-flash",
  "gemini-2.5-pro"
];



/**
 * Helper to clean and parse JSON, even if slightly malformed or truncated.
 */
function safeParseJSON(text: string): any {
  try {
    // Remove potential markdown code block wrappers
    const cleaned = text.replace(/^```json/i, "").replace(/```$/i, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON Parse Error. Raw text length:", text.length);
    // If it's truly truncated, we might try to close brackets, but for exams, 
    // it's better to show a meaningful error.
    throw new Error("The exam was too large for the AI to finish. Try uploading fewer training files or shortening the Matrix/Spec.");
  }
}

async function callWithFallback(params: Omit<GenerateContentParameters, 'model'>): Promise<string> {
  let lastError: any;
  const userKey = localStorage.getItem('user_gemini_api_key');
  const apiKey = userKey || process.env.API_KEY;

  if (!apiKey) {
    throw new Error("Missing API Key. Please click Settings to add your Google Gemini API Key.");
  }

  // Prioritize user's preferred model
  const preferredModel = localStorage.getItem('preferred_model');
  let modelsToTry = [...MODEL_PRIORITY];
  if (preferredModel && modelsToTry.includes(preferredModel)) {
    modelsToTry = [preferredModel, ...modelsToTry.filter(m => m !== preferredModel)];
  }

  for (const model of modelsToTry) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({ ...params, model });
      if (response.text) return response.text;
      throw new Error("Empty response from AI");
    } catch (err: any) {
      console.warn(`Model ${model} failed, trying next...`, err);
      lastError = err;

      // If error is 429 or 403, we should definitely try next model.
      // But if it's 401 (Invalid Key), we might want to stop? 
      // For now, consistent with instructions to just retry/show error at end.
    }
  }

  // Extract raw error message if possible
  const errorMessage = lastError?.message || JSON.stringify(lastError);
  throw new Error(`All AI models failed. Last error: ${errorMessage}`);
}

const DIFFICULTY_RULES = {
  'Primary': `
    **For PRIMARY (Grade 3-5):**
    - Vocabulary: Basic 500-1000 common words
    - Grammar: Simple present, present continuous, basic sentence structures
    - Reading passages: 80-150 words, simple topics (family, school, animals, daily activities)
    - Question types: Multiple choice, fill-in-the-blank, picture matching
    - Language complexity: A1-A2 CEFR level
    - Sentence length: 5-10 words average
    - Instructions: Simple and clear Vietnamese translations provided
    
    Example differentiation:
    - Grade 3: "The cat is on the table." (Simple present, basic vocabulary)
  `,
  'Middle School': `
    **For MIDDLE SCHOOL (Grade 6-9):**
    - Vocabulary: 1500-2500 words, topic-based vocabulary
    - Grammar: All basic tenses, conditionals, passive voice, reported speech
    - Reading passages: 200-300 words, varied topics (culture, environment, technology basics)
    - Question types: Multiple choice, gap-filling, short answers, true/false
    - Language complexity: A2-B1 CEFR level
    - Sentence length: 10-15 words average
    - Mix of concrete and some abstract concepts
    
    Example differentiation:
    - Grade 7: "If I had more time, I would visit my grandparents." (Second conditional, family relationships)
  `,
  'High School': `
    **For HIGH SCHOOL (Grade 10-12):**
    - Vocabulary: 3000-5000 words, academic and specialized vocabulary
    - Grammar: Complex structures, inversion, cleft sentences, advanced conditionals
    - Reading passages: 350-500 words, academic topics (science, social issues, literature analysis)
    - Question types: Multiple choice, long answers, essay-style, inference questions
    - Language complexity: B1-B2 CEFR level
    - Sentence length: 15-20 words average
    - Abstract thinking and critical analysis required
    
    Example differentiation:
    - Grade 11: "Despite numerous challenges, the environmental conservation movement has gained significant momentum globally." (Complex sentence, academic vocabulary)
  `
};

export const generateExam = async (config: ExamConfig, onProgress?: ProgressCallback): Promise<ExamData> => {
  const difficultyRule = DIFFICULTY_RULES[config.level as keyof typeof DIFFICULTY_RULES] || DIFFICULTY_RULES['Middle School'];

  const systemInstruction = `
    When user selects a grade level, you MUST:
    1. Analyze the selected grade (${config.gradeLevel})
    2. Apply the appropriate difficulty parameters below
    3. Generate exam content that matches EXACTLY the complexity level for that grade
    4. Use age-appropriate topics and contexts
    5. Adjust vocabulary, grammar structures, and cognitive demands accordingly
    6. Ensure reading passages and questions are neither too easy nor too difficult for the target grade
    
    ${difficultyRule}
  `;

  // STEP 1: STRUCTURAL ANALYSIS
  onProgress?.("Step 1/2: Analyzing Matrix & Training Data...");

  // Prune training data to avoid context overflow
  const prunedRef = config.referenceContent?.slice(0, 15000) || "None";
  const prunedMatrix = config.matrixContent?.slice(0, 5000);
  const prunedSpec = config.specificationContent?.slice(0, 5000);

  const step1Prompt = `
    Role: Senior Assessment Specialist.
    Analyze these requirements and create a logic-only blueprint.
    
    STRICT DIFFICULTY CONTROL:
    ${systemInstruction}

    Target Structure: ${config.structureContent || "Standard GDPT 2018"}
    Matrix: ${prunedMatrix}
    Spec: ${prunedSpec}
    Training Context (Excerpt): ${prunedRef}

    Task:
    1. Extract number of questions per section.
    2. Define grammar/vocab focus per section.
    3. Generate a High-Quality Reading Passage (concise, ~250 words) appropriate for ${config.gradeLevel}.
    4. Provide a structural plan. No full JSON yet.
  `;

  const plan = await callWithFallback({ contents: step1Prompt });

  // STEP 2: FULL CONTENT GENERATION
  onProgress?.("Step 2/2: Generating Exam Content (Be patient)...");

  const step2Prompt = `
    Role: Professional English Teacher.
    Create the FINAL EXAM JSON based on this plan: ${plan}
    
    CRITICAL DIFFICULTY ENFORCEMENT for ${config.gradeLevel}:
    ${systemInstruction}
    
    CRITICAL RULES for JSON Size Efficiency:
    1. DO NOT repeat the reading passage or long descriptions inside individual 'questions'. 
    2. Put shared text ONLY in the section's 'text' field.
    3. Keep question texts concise.
    4. Ensure the JSON is valid and complete.

    Exam Metadata: ${config.level} - ${config.gradeLevel}, Time: ${config.examType}.
    Formatting: Use Vietnamese headers ("I. PHẦN TRẮC NGHIỆM").

    Return ONLY JSON with this structure:
    {
      "examTitle": "string",
      "duration": "string",
      "content": [
        {
          "section": "string",
          "text": "string (shared passage here)",
          "questions": [{ "id": "Question 1", "text": "concise question", "points": 0.2, "parts": [{"label": "A.", "content": "..."}] }]
        }
      ],
      "answers": [{ "questionId": "Question 1", "answer": "A", "pointsDetail": "0.2 pts" }]
    }
  `;

  // Use a higher model if available for complex tasks
  const finalResponse = await callWithFallback({
    contents: step2Prompt,
    config: {
      responseMimeType: "application/json",
      // We don't define schema here to give model more flexibility to be concise, 
      // but we enforce it via instructions.
    }
  });

  return safeParseJSON(finalResponse) as ExamData;
};
