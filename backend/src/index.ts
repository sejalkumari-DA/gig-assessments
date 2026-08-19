import express from 'express';

import { handleVideoProfilingUpload } from './controllers/videoProfilingController';
import { handleAudioAssessmentUpload, generateAudioAssessmentQuestions } from './controllers/audioAssessmentController';
import { handleVideoInterviewUpload, generateVideoInterviewQuestions } from './controllers/videoInterviewController';


import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { PollyClient, SynthesizeSpeechCommand, OutputFormat, TextType, VoiceId } from "@aws-sdk/client-polly";
import { supabase, getSupabaseClient } from './utils/supabase';
import jwt from 'jsonwebtoken';

// Fallback for helper functions
const dbClient = supabase;

dotenv.config();

export const bedrockClient = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'ap-south-1' }) : null;
const pollyClient = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? new PollyClient({ region: process.env.AWS_REGION || 'ap-south-1' }) : null;
export const deepgramApiKey = process.env.DEEPGRAM_API_KEY || '';
const app = express();
const port = process.env.PORT || 5000;
export const skipAI = process.env.SKIP_AI === '1' || process.env.SKIP_AI === 'true' || process.env.SKIP_OPENAI === '1' || process.env.SKIP_OPENAI === 'true';

function buildCandidateNarrative(candidate: any, transcript: string, analysis: any) {
  const cleanText = (transcript || '').toLowerCase();
  const candidateName = [candidate?.first_name || candidate?.firstName, candidate?.last_name || candidate?.lastName]
    .filter(Boolean)
    .join(' ') || 'Candidate';
  const skills = typeof candidate?.skills === 'string'
    ? candidate.skills.split(',').map((skill: string) => skill.trim()).filter(Boolean).slice(0, 4)
    : [];
  const mentionedTech = ['python', 'node', 'react', 'javascript', 'typescript', 'sql', 'cloud', 'aws', 'database', 'api', 'ml', 'machine learning', 'nlp']
    .filter((keyword) => cleanText.includes(keyword));
  const strengths = [] as string[];
  const weaknesses = [] as string[];

  if (analysis.communication >= 7) {
    strengths.push(`${candidateName} communicated clearly and organized the introduction in a professional, easy-to-follow way.`);
  }
  if (mentionedTech.length) {
    strengths.push(`${candidateName} referenced relevant technical concepts such as ${mentionedTech.slice(0, 3).join(', ')}, which suggests practical exposure to modern tools and stacks.`);
  }
  if (analysis.confidence >= 7) {
    strengths.push(`${candidateName} sounded confident and positive about their experience, which is a strong signal for recruiter-facing communication.`);
  }
  if (skills.length) {
    strengths.push(`${candidateName}'s profile also aligns well with ${skills.join(', ')} and supports the skills discussed in the introduction.`);
  }
  if (analysis.professionalism >= 7) {
    strengths.push(`${candidateName} used a professional tone and showed a strong sense of teamwork, growth, and career direction.`);
  }
  if (!strengths.length) {
    strengths.push(`${candidateName} delivered a concise introduction, but the transcript would be more persuasive with more concrete skill and project examples.`);
  }

  if (analysis.fluency < 5) {
    weaknesses.push(`${candidateName} appeared hesitant at times and used filler words that reduced the clarity and flow of the introduction.`);
  }
  if (analysis.technical < 5) {
    weaknesses.push(`${candidateName} should provide more concrete examples of projects, tools, and outcomes to make the technical background more credible.`);
  }
  if (analysis.communication < 5) {
    weaknesses.push(`${candidateName} could improve by speaking more elaborately about role scope, achievements, and motivation for the opportunity.`);
  }
  if (analysis.grammar < 5) {
    weaknesses.push(`${candidateName} should focus on clearer sentence structure and reducing repetition to sound more refined and polished.`);
  }
  if (!weaknesses.length) {
    weaknesses.push(`${candidateName} could make the profile even stronger by adding measurable outcomes, project details, and a sharper closing statement.`);
  }

  const summary = `${candidateName} presents as ${analysis.overall >= 7 ? 'a strong and well-structured communicator with credible technical visibility and a professional tone' : 'a promising candidate whose introduction shows potential but needs more depth in delivery and role positioning'}. The transcript suggests ${analysis.communication >= 7 ? 'clear communication with a coherent storyline' : 'a workable communication style with room for more structure and specificity'}, ${analysis.technical >= 7 ? 'good technical awareness' : 'limited technical evidence'}, and ${analysis.fluency >= 7 ? 'a smooth speaking rhythm' : 'some hesitation that slightly reduces presentation quality'}. Overall, the interview tone and message framing indicate ${analysis.overall >= 7 ? 'strong interview readiness' : 'good potential but a need for stronger examples and more polished delivery'} for deeper screening.`;

  const recommendation = analysis.overall >= 7
    ? `${candidateName} is worth moving forward with a follow-up interview, particularly for roles that value ${mentionedTech.length ? mentionedTech.slice(0, 2).join(' and ') : 'communication, ownership, and clear problem-solving ability'}. The current transcript shows enough structure and confidence to justify a closer look.`
    : `${candidateName} should be considered for a short follow-up conversation, with extra attention on making the profile more concrete. A stronger answer should include specific project outcomes, clearer technical examples, and more confident delivery.`;

  return {
    summary,
    strengths: strengths.slice(0, 3),
    weaknesses: weaknesses.slice(0, 3),
    recommendation,
  };
}

export async function callBedrock(prompt: string, isJson: boolean = false) {
  if (!bedrockClient) {
    throw new Error('AWS credentials for Bedrock are not configured.');
  }

  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt + (isJson ? "\n\nPlease output ONLY valid JSON without any markdown formatting." : "")
          }
        ]
      }
    ],
    temperature: 0.7
  };

  const command = new InvokeModelCommand({
    modelId: "anthropic.claude-3-5-haiku-20241022-v1:0",
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(payload)
  });

  try {
    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const responseText = responseBody.content?.[0]?.text || '';
    return responseText.trim();
  } catch (error: any) {
    if (error.name === 'ValidationException' || error.message?.includes('not found') || error.name === 'ResourceNotFoundException') {
      console.log('Claude 3.5 Haiku not found or not enabled, falling back to Claude 3 Haiku...');
      const fallbackCommand = new InvokeModelCommand({
        modelId: "anthropic.claude-3-haiku-20240307-v1:0",
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(payload)
      });
      const response = await bedrockClient.send(fallbackCommand);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const responseText = responseBody.content?.[0]?.text || '';
      return responseText.trim();
    }
    throw error;
  }
}

export async function translateTranscriptToEnglish(transcript: string, sourceLanguage: string) {
  if (!transcript) return transcript;
  if (!sourceLanguage || sourceLanguage.startsWith('en')) return transcript;

  if (skipAI || !bedrockClient) {
    return transcript;
  }

  try {
    const translationPrompt = `Translate the following interview transcript into clear English. Return only the translated transcript text, with no extra explanations.\n\nSource language: ${sourceLanguage}\n\nTranscript:\n"""\n${transcript}\n"""`;
    const rawOutput = await callBedrock(translationPrompt);
    return rawOutput || transcript;
  } catch (error) {
    console.warn('English translation failed, falling back to original transcript.', error);
    return transcript;
  }
}

export async function transcribeWithDeepgram(audioBuffer: Buffer, language?: string) {
  if (!deepgramApiKey) {
    throw new Error('DEEPGRAM_API_KEY is not configured.');
  }

  let queryParams = 'model=nova-2&punctuate=true&paragraphs=true&smart_format=true&filler_words=false';
  if (language && language !== 'auto') {
    queryParams += `&language=${language}`;
  } else {
    queryParams += '&detect_language=true';
  }

  const response = await fetch(`https://api.deepgram.com/v1/listen?${queryParams}`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${deepgramApiKey}`,
      'Content-Type': 'audio/webm',
    },
    body: Uint8Array.from(audioBuffer),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Deepgram transcription failed: ${response.status} ${errorText}`);
  }

  const payload = await response.json() as any;
  const transcript = payload?.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() || '';
  const detectedLanguage = payload?.results?.channels?.[0]?.detected_language || '';
  return { transcript, detectedLanguage };
}

function getTranscriptSignals(transcript: string) {
  const cleanText = (transcript || '').toLowerCase();
  const words = cleanText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const sentenceCount = Math.max(1, (cleanText.match(/[.!?]+/g) || []).length);
  const fillerMatches = cleanText.match(/\b(um|uh|like|you know|so|actually|basically|i mean)\b/g) || [];
  const technicalKeywords = ['python', 'node', 'react', 'javascript', 'typescript', 'sql', 'cloud', 'aws', 'database', 'api', 'ml', 'machine learning', 'nlp'];
  const technicalMatches = technicalKeywords.filter((keyword) => cleanText.includes(keyword));
  const confidenceKeywords = ['confident', 'strong', 'excited', 'able', 'experienced', 'capable', 'comfortable', 'good at', 'worked on', 'led', 'built'];
  const confidenceMatches = confidenceKeywords.filter((keyword) => cleanText.includes(keyword));
  const professionalismKeywords = ['team', 'collaborate', 'professional', 'responsible', 'goal', 'experience', 'opportunity', 'career', 'growth'];
  const professionalismMatches = professionalismKeywords.filter((keyword) => cleanText.includes(keyword));
  const structureSignals = ['my name', 'i am', 'i have', 'currently', 'experience', 'skills', 'project', 'worked on', 'looking for'];
  const structureMatches = structureSignals.filter((keyword) => cleanText.includes(keyword));

  return {
    cleanText,
    wordCount,
    sentenceCount,
    fillerMatches,
    technicalMatches,
    confidenceMatches,
    professionalismMatches,
    structureMatches,
  };
}

function generateScoreExplanations(transcript: string, communication: number, confidence: number, technical: number, grammar: number, fluency: number, professionalism: number) {
  const signals = getTranscriptSignals(transcript);
  const { wordCount, sentenceCount, fillerMatches, technicalMatches, confidenceMatches, professionalismMatches, structureMatches } = signals;
  const insufficientEvidence = wordCount < 25 || sentenceCount < 2;

  const communicationText = insufficientEvidence
    ? 'This score is intentionally kept low because the transcript is too short or too sparse to support a meaningful communication assessment. There is not enough evidence yet to judge structure, clarity, or recruiter relevance with confidence.'
    : communication < 4
      ? 'This score reflects a limited introduction structure. The transcript does not yet give recruiters a strong sense of role fit, experience depth, or clear motivation, so the message feels brief rather than compelling.'
      : communication < 7
        ? `This score suggests the candidate can explain themselves, but the overall story is only partially structured. The intro gives basic context, yet it would feel stronger with clearer role framing, concrete examples, and more direct career positioning.`
        : `This score reflects a well-organized introduction. The candidate appears to present their background in a way that is coherent, easy to follow, and relevant to a recruiter, which helps the interviewer understand the profile quickly.`;

  const confidenceText = insufficientEvidence
    ? 'This score is capped because the transcript does not contain enough substantive evidence to support a high confidence rating. A one-line or very short answer can sound polite but does not yet prove ownership, readiness, or impact.'
    : confidence < 4
      ? 'The score suggests the candidate is not yet presenting themselves with strong ownership or professional conviction. The wording does not strongly emphasize outcomes, capability, or readiness for the role.'
      : confidence < 7
        ? `There are some positive confidence signals in the transcript, but the delivery could sound more decisive. Stronger statements about achievements, scope, or impact would make the profile feel more assured.`
        : `The candidate presents their background with clear self-assurance. The response shows ownership and a professional tone, which typically helps recruiters view the profile as more credible and ready.`;

  const technicalText = insufficientEvidence
    ? 'This score is low because the transcript does not provide enough concrete technical evidence. Without project examples, tools, or outcome details, it is hard to judge true technical depth from a single short statement.'
    : technical < 4
      ? 'The technical score remains low because the transcript does not provide enough concrete evidence of domain depth. Recruiters need more specific tools, platforms, or projects to judge technical capability confidently.'
      : technical < 7
        ? `The technical signal is moderate. The transcript references some relevant technologies, but the explanation is still fairly general. More precise examples of projects, frameworks, or implementation work would improve the technical credibility.`
        : `This score reflects meaningful technical visibility. The candidate mentions tools and technical concepts in a way that suggests practical exposure, which supports stronger evaluation of domain fit.`;

  const grammarText = insufficientEvidence
    ? 'This score is conservative because the response is too short to meaningfully judge grammar quality. A stronger assessment would require a fuller answer with complete sentences and more complete context.'
    : grammar < 4
      ? 'Grammar perception is affected by repeated hesitation and loose phrasing. The message is harder to follow when the candidate pauses or rephrases too often, which reduces polish in the first impression.'
      : grammar < 7
        ? 'The transcript is understandable overall, but the phrasing and flow are not fully polished. A more deliberate speaking pattern would lift the perceived quality of the response.'
        : 'The candidate’s grammar and sentence construction appear clear and professional. That helps recruiters interpret the profile with less effort and improves overall trust in the answer.';

  const fluencyText = insufficientEvidence
    ? 'This score is intentionally limited because the transcript is too brief to assess rhythm, pacing, or delivery quality in any reliable way. A fuller answer is needed to judge fluency properly.'
    : fluency < 4
      ? `The delivery shows noticeable hesitation or interruption, with ${fillerMatches.length} filler patterns detected. That can make the interview feel less smooth and reduce the impact of otherwise good content.`
      : fluency < 7
        ? `The candidate is generally understandable, but the speech rhythm is not fully natural. Short pauses, filler words, or repeated starts slightly reduce the confidence and flow of the response.`
        : 'The candidate’s speaking pattern is smooth and easy to follow. This strengthens the impression that the candidate can communicate naturally in a professional setting.';

  const professionalismText = insufficientEvidence
    ? 'This score stays low because the answer is too thin to establish a professional profile. Recruiters need more information about collaboration, ownership, goals, and business relevance before this can be assessed properly.'
    : professionalism < 4
      ? 'The response does not strongly frame the candidate in a recruiter-friendly way. It lacks enough signal around collaboration, outcomes, and career direction to create a strong professional impression.'
      : professionalism < 7
        ? 'There are some professional cues in the transcript, but the candidate could do more to connect their background to business value, teamwork, or growth direction.'
        : 'The candidate’s tone and framing suggest a professional, organized, and recruiter-friendly presentation. That improves how credible and mature the profile appears.';

  const scoreExplanations: { [key: string]: string } = {
    communication: `${communicationText} ${wordCount > 0 ? `The transcript contains ${wordCount} words, so the score reflects both substance and clarity of delivery.` : ''}`.trim(),
    confidence: `${confidenceText} ${confidenceMatches.length ? `The response includes cues such as "${confidenceMatches.slice(0, 2).join('" and "')}" that support confidence-related perception.` : 'There are not many explicit ownership or capability cues in the wording.'}`.trim(),
    technical: `${technicalText} ${technicalMatches.length ? `Relevant technical signals such as ${technicalMatches.slice(0, 3).join(', ')} appear in the transcript, which strengthens the technical profile.` : 'The transcript does not include enough explicit technology references to build a strong technical case.'}`.trim(),
    grammar: `${grammarText} ${fillerMatches.length ? `The repeated fillers (${fillerMatches.slice(0, 3).join(', ')}) slightly weaken the polished tone of the answer.` : 'The phrasing is relatively clean and easy to follow.'}`.trim(),
    fluency: `${fluencyText} ${fillerMatches.length ? `These hesitation markers are likely why the speaking flow feels less smooth than a polished interview response.` : 'The response cadence is steady enough to support a natural, confident delivery.'}`.trim(),
    professionalism: `${professionalismText} ${professionalismMatches.length ? `Signals around ${professionalismMatches.slice(0, 3).join(', ')} help show a more professional framing.` : 'The answer would benefit from stronger cues around teamwork, business alignment, and career direction.'}`.trim(),
  };

  return scoreExplanations;
}

export function createHeuristicAnalysis(transcript: string) {
  const cleanText = transcript.toLowerCase();
  const words = cleanText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const sentenceCount = Math.max(1, (cleanText.match(/[.!?]+/g) || []).length);
  const fillers = cleanText.match(/\b(um|uh|like|you know|so|actually|basically|i mean)\b/g) || [];
  const fillerPenalty = Math.min(fillers.length * 0.35, 3);
  const technicalKeywords = ['python', 'node', 'react', 'javascript', 'typescript', 'sql', 'cloud', 'aws', 'database', 'api', 'ml', 'machine learning', 'nlp'];
  const technicalMatches = technicalKeywords.filter((keyword) => cleanText.includes(keyword)).length;
  const confidenceKeywords = ['confident', 'strong', 'excited', 'able', 'experienced', 'capable', 'comfortable', 'worked on', 'led', 'built'];
  const confidenceCount = confidenceKeywords.filter((keyword) => cleanText.includes(keyword)).length;
  const professionalismMatches = ['opportunity', 'team', 'collaborate', 'professional', 'responsible', 'goal', 'experience'];
  const professionalismCount = professionalismMatches.filter((keyword) => cleanText.includes(keyword)).length;
  const structureKeywords = ['my name', 'i am', 'i have', 'currently', 'experience', 'skills', 'project', 'worked on', 'looking for'];
  const structureCount = structureKeywords.filter((keyword) => cleanText.includes(keyword)).length;

  const isVeryShort = wordCount < 25 || sentenceCount < 2;
  const shortIntroPenalty = wordCount < 30 ? 3 : wordCount < 50 ? 1.5 : 0;
  const weakContentPenalty = structureCount < 2 && technicalMatches === 0 && professionalismCount === 0 ? 2 : 0;
  const evidencePenalty = isVeryShort ? 3 : 0;
  const relevancePenalty = shortIntroPenalty + weakContentPenalty + evidencePenalty;

  const baseCommunication = Math.min(Math.max(wordCount / 20, 2), 9);
  const communication = Math.max(1, Math.min(10, Math.round(baseCommunication - fillerPenalty / 2 - relevancePenalty)));
  const confidence = Math.min(10, Math.max(1, Math.round(5 + confidenceCount * 1.2 - shortIntroPenalty - evidencePenalty)));
  const technical = Math.min(10, Math.max(1, Math.round(4 + technicalMatches * 1.5 + Math.min(wordCount / 50, 3) - relevancePenalty)));
  const grammar = Math.max(1, Math.min(10, Math.round(8 - fillerPenalty - shortIntroPenalty / 2 - evidencePenalty / 1.5)));
  const fluency = Math.max(1, Math.min(10, Math.round(7 - fillerPenalty / 2 - shortIntroPenalty / 2 - evidencePenalty / 1.5)));
  const professionalism = Math.max(1, Math.min(10, Math.round(5 + professionalismCount * 0.8 - relevancePenalty / 2)));

  const finalCommunication = isVeryShort ? Math.min(communication, 4) : communication;
  const finalConfidence = isVeryShort ? Math.min(confidence, 4) : confidence;
  const finalTechnical = isVeryShort ? Math.min(technical, 4) : technical;
  const finalGrammar = isVeryShort ? Math.min(grammar, 4) : grammar;
  const finalFluency = isVeryShort ? Math.min(fluency, 4) : fluency;
  const finalProfessionalism = isVeryShort ? Math.min(professionalism, 4) : professionalism;
  const overall = Number((((finalCommunication + finalConfidence + finalTechnical + finalGrammar + finalFluency + finalProfessionalism) / 6)).toFixed(1));

  const strengths = [] as string[];
  if (wordCount >= 50) strengths.push('Provided a detailed and structured introduction.');
  if (technicalMatches) strengths.push('Mentioned relevant technical skills and tools.');
  if (confidenceCount) strengths.push('Expressed confidence about their experience and abilities.');
  if (professionalismCount) strengths.push('Used professional language around teamwork and career goals.');
  if (!strengths.length && wordCount >= 30) strengths.push('Delivered a clear introduction with a steady pace.');
  if (!strengths.length) strengths.push('The response was too short to provide clear evidence of structure or depth.');

  const weaknesses = [] as string[];
  if (fillers.length) weaknesses.push('Used filler words that interrupted flow.');
  if (wordCount < 40) weaknesses.push('Could expand the introduction with more detail.');
  if (technicalMatches === 0) weaknesses.push('Could provide clearer technical examples to strengthen the profile.');
  if (!weaknesses.length) weaknesses.push('Could provide more specific concrete examples.');

  const summary = wordCount < 30
    ? `The response is too short to judge the candidate reliably. With only ${wordCount} words, the transcript does not provide enough evidence of communication quality, technical depth, or professionalism for a strong evaluation.`
    : `The candidate presented their background with ${wordCount} words and a ${communication >= 7 ? 'strong' : 'moderate'} communication style. ${technicalMatches ? 'They referenced technical experience, showing domain knowledge.' : 'More explicit technical details would strengthen the profile.'}`;

  const recommendation = overall >= 7
    ? 'Recommend follow-up interview to explore fit further.'
    : wordCount < 30
      ? 'Recommend a short follow-up conversation and request a more complete introduction before making a final screening decision.'
      : 'Recommend follow-up to clarify experience and presentation details.';

  const scoreExplanations = generateScoreExplanations(transcript, finalCommunication, finalConfidence, finalTechnical, finalGrammar, finalFluency, finalProfessionalism);

  return {
    communication: finalCommunication,
    confidence: finalConfidence,
    technical: finalTechnical,
    grammar: finalGrammar,
    fluency: finalFluency,
    professionalism: finalProfessionalism,
    overall,
    strengths,
    weaknesses,
    summary,
    recommendation,
    scoreExplanations,
  };
}

app.use(cors());
app.use(express.json());

// Use memory storage for direct upload to Supabase
const storage = multer.memoryStorage();
const uploadResume = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
const uploadVideo = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Candidate Onboarding Backend Running (Supabase Linked)' });
});

// Automatically ensure buckets exist
async function initStorage() {
  const bucketsToCreate = ['candidate-resume', 'video-profiles', 'audio-profiles'];
  for (const bucketName of bucketsToCreate) {
    const { data: bucket, error: getError } = await dbClient.storage.getBucket(bucketName);
    if (getError && getError.message.includes('not found')) {
      console.log(`Bucket ${bucketName} not found. Creating it...`);
      await dbClient.storage.createBucket(bucketName, { public: true });
    }
  }
}
initStorage();

// 1. Create candidate (form + resume)
app.post('/api/candidates/create', uploadResume.single('resume'), async (req, res) => {
  try {
    const { firstName, lastName, email, phone, location, experience, company, qualification, skills, linkedin, portfolio, salary, noticePeriod } = req.body;

    let resumeUrl = null;

    if (req.file) {
      const fileName = `${Date.now()}-${req.file.originalname}`;
      const { data, error } = await dbClient.storage
        .from('candidate-resume')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true
        });

      if (error) throw error;

      const { data: publicData } = dbClient.storage.from('candidate-resume').getPublicUrl(fileName);
      resumeUrl = publicData.publicUrl;
    }

    const { data: candidate, error: dbError } = await dbClient
      .from('candidates')
      .upsert(
        {
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          location,
          experience,
          company,
          qualification,
          skills,
          linkedin,
          portfolio,
          expected_salary: salary,
          notice_period: noticePeriod,
          resume_url: resumeUrl,
          status: 'Pending Video',
        },
        { onConflict: 'email' }
      )
      .select('id')
      .single();

    if (dbError) throw dbError;
    if (!candidate?.id) throw new Error('Candidate record could not be created.');

    res.json({ success: true, candidateId: candidate.id });
  } catch (error: any) {
    console.error('Error creating candidate:', error.message);
    res.status(500).json({ success: false, error: 'Failed to create candidate', details: error.message });
  }
});
// 2. Upload video recording
app.post('/api/upload/recording', uploadVideo.fields([{ name: 'video', maxCount: 1 }, { name: 'audio', maxCount: 1 }]), async (req, res) => {
  const type = req.body.type || '';
  if (type === 'video-interview') {
    return handleVideoInterviewUpload(req, res);
  } else if (type === 'audio') {
    return handleAudioAssessmentUpload(req, res);
  } else {
    return handleVideoProfilingUpload(req, res);
  }
});

// Fetch specific assessment session
app.get('/api/assessments/:type/:sessionId', async (req, res) => {
  const env = req.headers['x-environment'] as string;
  const dbClient = getSupabaseClient(env);
  const { type, sessionId } = req.params;
  
  try {
    let tableName = 'video_profile_interviews';
    if (type === 'audio') tableName = 'audio_assessments';
    if (type === 'video-interview') tableName = 'video_interviews';
    
    const { data: assessment, error } = await dbClient
      .from(tableName)
      .select('*, workers(*)')
      .eq('id', sessionId)
      .single();
      
    if (error) {
       console.error('Assessment lookup error:', error.message);
       return res.status(404).json({ success: false, error: 'Report not found' });
    }
    
    const candidate = assessment.workers;
    delete assessment.workers;
    
    res.json({ success: true, assessment, candidate });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// 3. Get all candidates for recruiter dashboard
app.get('/api/candidates', async (req, res) => {
  const env = req.headers['x-environment'] as string;
  const dbClient = getSupabaseClient(env);
  try {
    const { data: interviews, error } = await dbClient
      .from('video_profile_interviews')
      .select('*, workers(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Filter out rows without a worker relation just in case
    const validInterviews = interviews.filter(i => i.workers);

    // Keep only the latest interview for each worker to prevent duplicate React keys
    const uniqueInterviews = [];
    const seenWorkers = new Set();
    for (const interview of validInterviews) {
      if (!seenWorkers.has(interview.worker_id)) {
        seenWorkers.add(interview.worker_id);
        uniqueInterviews.push(interview);
      }
    }

    const mappedCandidates = uniqueInterviews.map((c) => {
      const worker = c.workers;
      let orig = c.transcript || '';
      let eng = c.transcript || '';
      if (orig.includes('---EN_TRANS---')) {
        const parts = orig.split('---EN_TRANS---');
        orig = parts[0].trim();
        eng = parts[1].trim();
      }

      const narrative = buildCandidateNarrative(worker, eng, {
        communication: c.communication_score ?? 0,
        confidence: c.confidence_score ?? 0,
        technical: c.technical_score ?? 0,
        grammar: c.grammar_score ?? 0,
        fluency: c.fluency_score ?? 0,
        professionalism: c.professionalism_score ?? 0,
        overall: c.overall_score ?? 0,
      });

      const scoreExplanations = generateScoreExplanations(
        eng,
        c.communication_score || 0,
        c.confidence_score || 0,
        c.technical_score || 0,
        c.grammar_score || 0,
        c.fluency_score || 0,
        c.professionalism_score || 0
      );

      let candidateSkills = c.skills || worker.skills || '';
      if (Array.isArray(candidateSkills)) {
        candidateSkills = candidateSkills.join(', ');
      } else if (typeof candidateSkills !== 'string') {
        candidateSkills = String(candidateSkills);
      }

      return {
        id: worker.id,
        firstName: worker.first_name,
        lastName: worker.last_name,
        email: worker.email,
        phone: worker.phone,
        location: worker.location || worker.city || '',
        experience: worker.experience || worker.total_years_experience || '',
        company: worker.company || '',
        qualification: worker.qualification || worker.highest_edu_qualification || '',
        skills: candidateSkills,
        linkedin: worker.linkedin_url || '',
        portfolio: worker.portfolio_url || '',
        salary: worker.min_hourly_rate_usd || '',
        noticePeriod: worker.notice_period || '',
        resumeUrl: worker.resume_url,
        videoUrl: c.video_url,
        audioUrl: c.audio_url,
        transcript: orig,
        englishTranscript: eng,
        interviewLanguage: 'en-US',
        communicationScore: c.communication_score ?? 0,
        confidenceScore: c.confidence_score ?? 0,
        technicalScore: c.technical_score ?? 0,
        grammarScore: c.grammar_score ?? 0,
        fluencyScore: c.fluency_score ?? 0,
        professionalismScore: c.professionalism_score ?? 0,
        overallScore: c.overall_score ?? 0,
        summary: (c.summary && c.summary.length > 10) ? c.summary : narrative.summary,
        strengths: (c.strengths && c.strengths.length > 0) ? c.strengths : narrative.strengths,
        weaknesses: (c.weaknesses && c.weaknesses.length > 0) ? c.weaknesses : narrative.weaknesses,
        recommendation: (c.recommendation && c.recommendation.length > 10) ? c.recommendation : narrative.recommendation,
        scoreExplanations,
        status: c.status || 'Completed',
        createdAt: c.created_at,
      };
    });

    res.json({ success: true, candidates: mappedCandidates });
  } catch (error: any) {
    console.error('Error fetching candidates:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch candidates' });
  }
});

app.delete('/api/candidates/:id', async (req, res) => {
  const env = req.headers['x-environment'] as string;
  const dbClient = getSupabaseClient(env);
  try {
    const { id } = req.params;
    const { error } = await dbClient
      .from('candidates')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Candidate deleted successfully.' });
  } catch (error: any) {
    console.error('Error deleting candidate:', error.message);
    res.status(500).json({ success: false, error: 'Failed to delete candidate' });
  }
});

app.get('/api/candidates/:id/report', async (req, res) => {
  const env = req.headers['x-environment'] as string;
  const dbClient = getSupabaseClient(env);
  try {
    const { id } = req.params;

    // First, try to fetch from production tables
    const { data: worker, error: workerError } = await dbClient
      .from('workers')
      .select('first_name, last_name, email, phone, resume_url, profile')
      .eq('id', id)
      .single();

    if (!workerError && worker) {
      // Fetch their most recent video profile
      const { data: interview, error: interviewError } = await dbClient
        .from('video_profile_interviews')
        .select('*')
        .eq('worker_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (interviewError && interviewError.code !== 'PGRST116') {
        throw interviewError;
      }

      let orig = interview?.transcript || '';
      let eng = interview?.transcript || '';
      if (orig.includes('---EN_TRANS---')) {
        const parts = orig.split('---EN_TRANS---');
        orig = parts[0].trim();
        eng = parts[1].trim();
      }

      const narrative = buildCandidateNarrative(worker, eng, {
        communication: interview?.communication_score ?? 0,
        confidence: interview?.confidence_score ?? 0,
        technical: interview?.technical_score ?? 0,
        grammar: interview?.grammar_score ?? 0,
        fluency: interview?.fluency_score ?? 0,
        professionalism: interview?.professionalism_score ?? 0,
        overall: interview?.overall_score ?? 0,
      });

      const scoreExplanations = generateScoreExplanations(
        eng,
        interview?.communication_score || 0,
        interview?.confidence_score || 0,
        interview?.technical_score || 0,
        interview?.grammar_score || 0,
        interview?.fluency_score || 0,
        interview?.professionalism_score || 0
      );

      return res.json({
        success: true,
        candidate: {
          id,
          firstName: worker.first_name,
          lastName: worker.last_name,
          email: worker.email,
          phone: worker.phone,
          resumeUrl: worker.resume_url,
          videoUrl: interview?.video_url,
          transcript: orig,
          englishTranscript: eng,
          communicationScore: interview?.communication_score ?? 0,
          confidenceScore: interview?.confidence_score ?? 0,
          technicalScore: interview?.technical_score ?? 0,
          grammarScore: interview?.grammar_score ?? 0,
          fluencyScore: interview?.fluency_score ?? 0,
          professionalismScore: interview?.professionalism_score ?? 0,
          overallScore: interview?.overall_score ?? 0,
          summary: (interview?.summary && interview.summary.length > 10) ? interview.summary : narrative.summary,
          strengths: (interview?.strengths && interview.strengths.length > 0) ? interview.strengths : narrative.strengths,
          weaknesses: (interview?.weaknesses && interview.weaknesses.length > 0) ? interview.weaknesses : narrative.weaknesses,
          recommendation: (interview?.recommendation && interview.recommendation.length > 10) ? interview.recommendation : narrative.recommendation,
          scoreExplanations,
          status: interview?.status || 'Pending Video',
        },
      });
    }

    // FALLBACK TO DUMMY DATABASE `candidates` TABLE
    const { data: candidate, error: candidateError } = await dbClient
      .from('candidates')
      .select('*')
      .eq('id', id)
      .single();

    if (candidateError) throw candidateError;

    let orig = candidate.transcript || '';
    let eng = candidate.transcript || '';
    if (orig.includes('---EN_TRANS---')) {
      const parts = orig.split('---EN_TRANS---');
      orig = parts[0].trim();
      eng = parts[1].trim();
    }

    const narrative = buildCandidateNarrative(candidate, eng, {
      communication: candidate.communication_score ?? 0,
      confidence: candidate.confidence_score ?? 0,
      technical: candidate.technical_score ?? 0,
      grammar: candidate.grammar_score ?? 0,
      fluency: candidate.fluency_score ?? 0,
      professionalism: candidate.professionalism_score ?? 0,
      overall: candidate.overall_score ?? 0,
    });

    const scoreExplanations = generateScoreExplanations(
      eng,
      candidate.communication_score || 0,
      candidate.confidence_score || 0,
      candidate.technical_score || 0,
      candidate.grammar_score || 0,
      candidate.fluency_score || 0,
      candidate.professionalism_score || 0
    );

    res.json({
      success: true,
      candidate: {
        id: candidate.id,
        firstName: candidate.first_name,
        lastName: candidate.last_name,
        email: candidate.email,
        phone: candidate.phone,
        location: candidate.location,
        experience: candidate.experience,
        company: candidate.company,
        qualification: candidate.qualification,
        skills: candidate.skills,
        linkedin: candidate.linkedin,
        portfolio: candidate.portfolio,
        salary: candidate.expected_salary,
        noticePeriod: candidate.notice_period,
        resumeUrl: candidate.resume_url,
        videoUrl: candidate.video_url,
        transcript: orig || 'Transcript not available yet. Enable AI transcription or wait for processing.',
        englishTranscript: eng || '',
        interviewLanguage: candidate.interview_language || 'en-US',
        communicationScore: candidate.communication_score ?? 0,
        confidenceScore: candidate.confidence_score ?? 0,
        technicalScore: candidate.technical_score ?? 0,
        grammarScore: candidate.grammar_score ?? 0,
        fluencyScore: candidate.fluency_score ?? 0,
        professionalismScore: candidate.professionalism_score ?? 0,
        overallScore: candidate.overall_score ?? 0,
        summary: (candidate.summary && candidate.summary.length > 10) ? candidate.summary : narrative.summary,
        strengths: (candidate.strengths && candidate.strengths.length > 0) ? candidate.strengths : narrative.strengths,
        weaknesses: (candidate.weaknesses && candidate.weaknesses.length > 0) ? candidate.weaknesses : narrative.weaknesses,
        recommendation: (candidate.recommendation && candidate.recommendation.length > 10) ? candidate.recommendation : narrative.recommendation,
        scoreExplanations,
        status: candidate.status,
        createdAt: candidate.created_at,
      },
    });
  } catch (error: any) {
    console.error('Error fetching report:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch report' });
  }
});



app.get('/api/candidates/:id/questions', async (req, res) => {
  const type = req.query.type as string;
  if (type === 'video-interview') {
    return generateVideoInterviewQuestions(req, res);
  } else if (type === 'audio') {
    return generateAudioAssessmentQuestions(req, res);
  }
  
  // Default to standard profiling questions
  const env = req.headers['x-environment'] as string;
  const dbClient = getSupabaseClient(env);
  try {
    const workerId = req.params.id;

    // 1. Fetch the parsed resume from pdf_parsed_data
    let resumeText = '';
    try {
      const { data: parsedData, error: dbError } = await dbClient
        .from('pdf_parsed_data')
        .select('data')
        .eq('worker_id', workerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (parsedData?.data) {
        resumeText = JSON.stringify(parsedData.data);
      }
    } catch (dbEx) {
      console.warn('Could not fetch parsed data, falling back to default questions.');
    }

    const defaultQuestions = [
      "Could you please introduce yourself and provide a brief overview of your background?",
      "Can you highlight the key skills and experiences that make you a great fit?",
      "What are your career goals and what are you looking for in your next role?"
    ];

    // 2. Generate custom questions using Gemini/Bedrock
    if (bedrockClient) {
      let prompt = '';
      if (!resumeText || resumeText.length < 50) {
        prompt = `You are an expert technical recruiter. The candidate's resume is currently unavailable. 
Generate exactly 3 professional interview questions for a software engineering role.
1. The first question should ask them to introduce themselves briefly.
2. The second question should be a general behavioral or situational question.
3. The third question should test a general technical concept (e.g. debugging, system design, or clean code).

Return ONLY a valid JSON array of strings containing the 3 questions. No markdown formatting, no explanations.`;
      } else {
        prompt = `You are an expert technical recruiter. Based on the following parsed resume JSON data, generate exactly 3 highly personalized, professional interview questions.
      
1. The first question should ask them to introduce themselves briefly.
2. The second question should be about a specific project, role, or achievement mentioned in their resume.
3. The third question should test a core technical or professional skill listed in their resume.

Return ONLY a valid JSON array of strings containing the 3 questions. No markdown formatting, no explanations.

Resume Data:
${resumeText.substring(0, 4000)} // truncate to avoid token limits if necessary
`;
      }
      const rawOutput = await callBedrock(prompt, true);
      const jsonMatch = rawOutput.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        const questions = JSON.parse(jsonMatch[0]);
        if (Array.isArray(questions) && questions.length > 0) {
          return res.json({ success: true, questions: questions.slice(0, 3), source: 'ai' });
        }
      }
    }

    return res.json({ success: true, questions: defaultQuestions, source: 'fallback' });
  } catch (err: any) {
    console.error('Failed to generate dynamic questions:', err);
    return res.json({
      success: true,
      questions: [
        "Could you please introduce yourself and provide a brief overview of your background?",
        "Can you highlight the key skills and experiences that make you a great fit?",
        "What are your career goals and what are you looking for in your next role?"
      ],
      source: 'fallback-error'
    });
  }
});

app.listen(port, () => {
  console.log(`Backend server running on port ${port} with Supabase`);
});
