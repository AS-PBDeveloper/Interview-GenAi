const { GoogleGenAI } = require("@google/genai");
const { z } = require("zod");
const { zodToJsonSchema } = require("zod-to-json-schema");
const puppeteer = require("puppeteer");

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
});

// Manually defined JSON schema (replaces zodToJsonSchema which is incompatible with Zod v4)
const interviewReportJsonSchema = {
  type: "object",
  required: [
    "matchScore",
    "technicalQuestions",
    "behavioralQuestions",
    "skillGaps",
    "preparationPlan",
    "title",
  ],
  properties: {
    matchScore: {
      type: "number",
      description:
        "A score between 0 and 100 indicating how well the candidate's profile matches the job description",
    },
    title: {
      type: "string",
      description:
        "The professional job title for which the interview report is generated",
    },
    technicalQuestions: {
      type: "array",
      description:
        "5-7 technical questions relevant to the job with intentions and model answers",
      items: {
        type: "object",
        required: ["question", "intention", "answer"],
        properties: {
          question: {
            type: "string",
            description: "The technical interview question",
          },
          intention: {
            type: "string",
            description: "Why the interviewer asks this question",
          },
          answer: {
            type: "string",
            description: "How to answer this question effectively",
          },
        },
      },
    },
    behavioralQuestions: {
      type: "array",
      description:
        "3-5 behavioral questions using STAR method with intentions and model answers",
      items: {
        type: "object",
        required: ["question", "intention", "answer"],
        properties: {
          question: {
            type: "string",
            description: "The behavioral interview question",
          },
          intention: {
            type: "string",
            description: "Why the interviewer asks this question",
          },
          answer: {
            type: "string",
            description: "How to answer this question using the STAR method",
          },
        },
      },
    },
    skillGaps: {
      type: "array",
      description:
        "List of skill gaps the candidate has relative to the job requirements",
      items: {
        type: "object",
        required: ["skill", "severity"],
        properties: {
          skill: { type: "string", description: "The missing or weak skill" },
          severity: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "How critical this gap is",
          },
        },
      },
    },
    preparationPlan: {
      type: "array",
      description: "A 3-5 day focused preparation roadmap with daily tasks",
      items: {
        type: "object",
        required: ["day", "focus", "tasks"],
        properties: {
          day: { type: "number", description: "Day number starting from 1" },
          focus: {
            type: "string",
            description: "The main focus topic for this day",
          },
          tasks: {
            type: "array",
            items: { type: "string" },
            description: "List of specific tasks to complete this day",
          },
        },
      },
    },
  },
};

async function generateInterviewReport({
  resume,
  selfDescription,
  jobDescription,
}) {
  const prompt = `You are a world-class technical recruiter and career coach. 
Generate a comprehensive, high-quality interview preparation report for a candidate.

CANDIDATE DETAILS:
- Resume content: ${resume}
- Self Description: ${selfDescription}

TARGET JOB:
- Job Description: ${jobDescription}

INSTRUCTIONS:
1. Analyze the profile against the job requirements.
2. Provide a match score (0-100).
3. Generate 5-7 highly relevant technical questions with intentions and model answers.
4. Generate 3-5 behavioral questions using the STAR method approach.
5. Identify specific skill gaps and their severity (low/medium/high).
6. Create a 3-5 day focused preparation roadmap with specific daily tasks.
7. Determine a professional job title for the report.

CRITICAL: Your response must be an exhaustive, detailed JSON object that strictly adheres to the provided schema. Do not omit any sections or leave arrays empty.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: interviewReportJsonSchema,
    },
  });

  return JSON.parse(response.text);
}

async function generatePdfFromHtml(htmlContent) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    margin: {
      top: "20mm",
      bottom: "20mm",
      left: "15mm",
      right: "15mm",
    },
  });

  await browser.close();

  return pdfBuffer;
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {
  const resumePdfSchema = z.object({
    html: z
      .string()
      .describe(
        "The HTML content of the resume which can be converted to PDF using any library like puppeteer",
      ),
  });

  const prompt = `Generate resume for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}

                        the response should be a JSON object with a single field "html" which contains the HTML content of the resume which can be converted to PDF using any library like puppeteer.
                        The resume should be tailored for the given job description and should highlight the candidate's strengths and relevant experience. The HTML content should be well-formatted and structured, making it easy to read and visually appealing.
                        The content of resume should be not sound like it's generated by AI and should be as close as possible to a real human-written resume.
                        you can highlight the content using some colors or different font styles but the overall design should be simple and professional.
                        The content should be ATS friendly, i.e. it should be easily parsable by ATS systems without losing important information.
                        The resume should not be so lengthy, it should ideally be 1-2 pages long when converted to PDF. Focus on quality rather than quantity and make sure to include all the relevant information that can increase the candidate's chances of getting an interview call for the given job description.
                    `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: zodToJsonSchema(resumePdfSchema),
    },
  });

  const jsonContent = JSON.parse(response.text);

  const pdfBuffer = await generatePdfFromHtml(jsonContent.html);

  return pdfBuffer;
}

module.exports = { generateInterviewReport, generateResumePdf };
