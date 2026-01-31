require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-client');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase
        .from('albums')
        .select('*')
        .is('user_id', null);

    if (error) {
        console.error(error);
        return;
    }
    console.log('Albums without user_id:', data);

    if (data.length > 0) {
        const ids = data.map(a => a.id);
        const { error: delError } = await supabase
            .from('albums')
            .delete()
            .in('id', ids);
        if (delError) console.error('Error deleting:', delError);
        else console.log('Deleted orphaned albums');
    }
}

check();
