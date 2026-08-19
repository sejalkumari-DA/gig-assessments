import { supabase } from './utils/supabase';

async function fix() {
  const { data, error } = await supabase
    .from('candidates')
    .update({
      communication_score: 6,
      confidence_score: 6,
      technical_score: 8,
      grammar_score: 6,
      fluency_score: 6,
      professionalism_score: 7,
      overall_score: 6.5,
      status: 'Completed'
    })
    .eq('id', 'abb4b9c4-3a94-4848-b234-29643cb57b33');
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Fixed candidate scores');
  }
}
fix();
