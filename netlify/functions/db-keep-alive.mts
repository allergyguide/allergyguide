import { schedule } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

/**
 * Runs every 3 days at midnight UTC.
 * Cron: 0 0 */3 /* /* (Minute Hour DayOfMonth Month DayOfWeek)
 */
export const handler = schedule('0 0 */3 * *', async () => {
  console.log('Keep-alive ping...');

  try {
    // Perform a simple read on test table 
    const { data, error } = await supabase
      .from('test')
      .select('id')
      .limit(1)
      .single();

    if (error) {
      console.error('Keep-alive ping failed:', error.message);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message })
      };
    }

    console.log('Keep-alive ping successful. Found row ID:', data?.id);
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, id: data?.id })
    };
  } catch (err: any) {
    console.error('Unexpected error during keep-alive:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
});
