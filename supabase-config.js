// Supabase Configuration
// Replace these with your actual Supabase credentials from https://app.supabase.com

const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

// Initialize Supabase client
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth helpers
async function signUpUser(email, password, firstName, lastName, role, selectedFields) {
  try {
    // Sign up with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) throw error;

    const userId = data.user.id;
    
    // Generate Career ID
    const careerID = 'CIS-' + new Date().getFullYear() + '-' + Math.floor(100000 + Math.random() * 900000);

    // Insert user profile into database
    const { error: dbError } = await supabase
      .from('users')
      .insert([{
        id: userId,
        email: email,
        first_name: firstName,
        last_name: lastName,
        career_id: careerID,
        role: role,
        target_roles: selectedFields,
        profile_score: 20,
        created_at: new Date(),
      }]);

    if (dbError) throw dbError;

    return { success: true, careerID, userId };
  } catch (error) {
    console.error('Sign up error:', error);
    return { success: false, error: error.message };
  }
}

async function loginUser(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) throw error;

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) throw profileError;

    return { success: true, user: data.user, profile: profile };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
}

async function logoutUser() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: error.message };
  }
}

async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}

// Portfolio/Skills functions
async function addSkillToProfile(userId, skill) {
  try {
    const { data, error } = await supabase
      .from('skills')
      .insert([{
        user_id: userId,
        skill_name: skill,
        created_at: new Date(),
      }]);

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Add skill error:', error);
    return { success: false, error: error.message };
  }
}

async function getUserSkills(userId) {
  try {
    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Get skills error:', error);
    return { success: false, error: error.message };
  }
}

// Job matching functions
async function getJobMatches(userId) {
  try {
    const { data, error } = await supabase
      .from('job_matches')
      .select('*')
      .eq('user_id', userId)
      .order('match_score', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Get job matches error:', error);
    return { success: false, error: error.message };
  }
}

// Resume upload (stores metadata in DB)
async function uploadResume(userId, file) {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('resumes')
      .upload(fileName, file);

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('resumes')
      .getPublicUrl(fileName);

    // Store resume metadata in DB
    const { error: dbError } = await supabase
      .from('resumes')
      .insert([{
        user_id: userId,
        file_name: file.name,
        file_path: publicUrl,
        uploaded_at: new Date(),
      }]);

    if (dbError) throw dbError;

    return { success: true, publicUrl };
  } catch (error) {
    console.error('Resume upload error:', error);
    return { success: false, error: error.message };
  }
}
