import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://esqsgamdxufkodraysaj.supabase.co';
const supabaseKey = 'sb_publishable_RF3wonSBQp4qL9y8ZLUztQ_TQOmHgH4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  
  const { data, error } = await supabase
    .from('employees')
    .select('*');
  
  if (error) {
  } else {
  }
}

testConnection();