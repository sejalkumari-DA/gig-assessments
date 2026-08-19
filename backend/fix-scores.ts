import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const geminiApiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(geminiApiKey);
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

async function fixScores() {
  console.log('Fetching candidates with 0 communication score...');
  const { data: candidates, error } = await supabase
    .from('candidates')
    .select('id, transcript')
    .or('communication_score.eq.0,communication_score.is.null');

  if (error) {
    console.error('Error fetching candidates:', error);
    return;
  }

  console.log(`Found ${candidates?.length || 0} candidates to fix.`);

  for (const candidate of candidates || []) {
    if (!candidate.transcript || candidate.transcript.trim() === '') {
      console.log(`Skipping candidate ${candidate.id}: No transcript.`);
      continue;
    }

    console.log(`Analyzing candidate ${candidate.id}...`);
    const analysisPrompt = `You are an experienced recruiter analyzing a candidate's self-recorded introduction transcript. Return only valid JSON with the following keys: communication, confidence, technical, grammar, fluency, professionalism, overall, strengths, weaknesses, summary, recommendation. Scores should be integers from 1 to 10, overall can be a decimal number. Strengths and weaknesses should be arrays of short statements. Summary should be a concise paragraph. Recommendation should be a short sentence.

Important evaluation rules:
- If the transcript is extremely short, vague, one-sentence, or lacks role-relevant content, strongly lower all six scores and do not treat it as a credible interview sample.
- A one-line answer should not receive a score above 4 in any category unless it clearly contains meaningful evidence from the candidate's background.
- Base the score on actual transcript evidence such as skills, projects, outcomes, role alignment, and delivery clarity.
- Never infer strong technical or professionalism from generic filler text or a short introductory sentence alone.
- Make the summary and recommendation recruiter-friendly and decision-oriented.

Transcript:
"""
${candidate.transcript}
"""

Only return the JSON object.`;

    try {
      const result = await geminiModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: analysisPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      });
      const rawOutput = result.response.text();
      const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const extractValue = (obj: any, keyword: string): any => {
          if (!obj || typeof obj !== 'object') return null;
          for (const [k, v] of Object.entries(obj)) {
            if (k.toLowerCase().includes(keyword)) return v;
            if (typeof v === 'object') {
              const nested = extractValue(v, keyword);
              if (nested !== null) return nested;
            }
          }
          return null;
        };
        
        const getNum = (key: string) => {
          const val = extractValue(parsed, key);
          if (val === null) return 0;
          const num = parseFloat(String(val).replace(/[^0-9.]/g, ''));
          return isNaN(num) ? 0 : num;
        };
        
        const analysis = {
          communication_score: getNum('communication'),
          confidence_score: getNum('confidence'),
          technical_score: getNum('technical'),
          grammar_score: getNum('grammar'),
          fluency_score: getNum('fluency'),
          professionalism_score: getNum('professionalism'),
          overall_score: getNum('overall'),
          strengths: extractValue(parsed, 'strength') || [],
          weaknesses: extractValue(parsed, 'weakness') || [],
          summary: extractValue(parsed, 'summary') || '',
          recommendation: extractValue(parsed, 'recommendation') || '',
        };

        const { error: updateError } = await supabase
          .from('candidates')
          .update(analysis)
          .eq('id', candidate.id);

        if (updateError) {
          console.error(`Failed to update candidate ${candidate.id}:`, updateError.message);
        } else {
          console.log(`Successfully updated candidate ${candidate.id}`);
        }
      } else {
        console.log(`No JSON returned for candidate ${candidate.id}`);
      }
    } catch (err: any) {
      console.error(`Error processing candidate ${candidate.id}:`, err.message);
    }
  }
  console.log('Finished fixing scores.');
}

fixScores();
