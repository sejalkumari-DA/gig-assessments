import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-pro' });

const transcript = `Hello. Hello. I am. Currently, I am working as an AI engineer at dataalchemy dot ai. So I joined dataalchemy in January. Since then, I was working as an AI intern, and, essentially, I got my conversion as a full time employee. So if I talk about my skills and technical expertise, so I have been working on technologies like machine learning, artificial intelligence, and I do programming in Python. And recently, I am also working in technologies like LLM, NLP, RAG, lang, chain lang, graph, and currently, I am working on agentic workflows. So, basically, I am working for a platform where we are building agents for multiple purposes. For example, to screen an agent, to to sorry. To screen a candidate, to show some candidate, even to track the whole pipeline of the candidate. So I am involved in this kind of thing currently. And apart from that, I also love to do some kind of research work. So for that, I have also published my, research book chapter, that is in also artificial intelligence and augmented reality only. So now I aims to be an AI expert. So this is quite about me. Thank you.`;

const analysisPrompt = `You are an experienced recruiter analyzing a candidate's self-recorded introduction transcript. Return only valid JSON with the following keys: communication, confidence, technical, grammar, fluency, professionalism, overall, strengths, weaknesses, summary, recommendation. Scores should be integers from 1 to 10, overall can be a decimal number. Strengths and weaknesses should be arrays of short statements. Summary should be a concise paragraph. Recommendation should be a short sentence.

Important evaluation rules:
- If the transcript is extremely short, vague, one-sentence, or lacks role-relevant content, strongly lower all six scores and do not treat it as a credible interview sample.
- A one-line answer should not receive a score above 4 in any category unless it clearly contains meaningful evidence from the candidate's background.
- Base the score on actual transcript evidence such as skills, projects, outcomes, role alignment, and delivery clarity.
- Never infer strong technical or professionalism from generic filler text or a short introductory sentence alone.
- Make the summary and recommendation recruiter-friendly and decision-oriented.

Transcript:
"""
${transcript}
"""

Only return the JSON object.`;

async function test() {
  const result = await geminiModel.generateContent({
    contents: [{ role: 'user', parts: [{ text: analysisPrompt }] }],
    generationConfig: {
      responseMimeType: "application/json"
    }
  });
  console.log(result.response?.text());
}
test().catch(console.error);
