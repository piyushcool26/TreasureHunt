import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import postgres from "https://deno.land/x/postgresjs@v3.4.3/mod.js";

/**
 * ⚠️ CRITICAL DATA INTEGRITY POLICY ⚠️
 *
 * SUBMISSIONS TABLE IS APPEND-ONLY - NEVER DELETE OR UPDATE
 *
 * The submissions table is an immutable audit log that records all user submissions.
 * It must NEVER be modified or deleted under any circumstances, including:
 * - When questions are deleted
 * - When rounds are reset
 * - When users are removed
 * - At any time via admin UI or API
 *
 * Submission history must be preserved permanently for:
 * - Audit trails
 * - Historical data analysis
 * - Compliance requirements
 * - Fair play verification
 *
 * User progress is calculated dynamically by querying submissions with round_number filter.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-token",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Hardcoded admin email - ONLY this email gets admin role
const ADMIN_EMAIL = "admin@google.com";
const ALLOWED_DOMAIN = "@google.com";

function decodeJWT(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return { id: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

// Determine role based on email
function getUserRole(email: string): string {
  return email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? "admin" : "user";
}

// Get or create user profile in database
async function getOrCreateProfile(userId: string, email: string) {
  // Check if profile exists
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (existing) {
    // Profile exists, ensure role is correct (in case admin email changed)
    const correctRole = getUserRole(email);
    if (existing.role !== correctRole) {
      const { data: updated } = await supabase
        .from('profiles')
        .update({ role: correctRole })
        .eq('id', userId)
        .select()
        .single();
      return updated || existing;
    }
    return existing;
  }

  // Profile doesn't exist, create it
  const role = getUserRole(email);
  const { data: newProfile } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email,
      role,
      current_question: 1,
      last_submission_time: new Date().toISOString(),
    })
    .select()
    .single();

  console.log(`Created new profile: ${email} (${role})`);
  return newProfile;
}

async function initDatabase() {
  // Run migrations
  try {
    const dbUrl = Deno.env.get("SUPABASE_DB_URL");
    if (dbUrl) {
      const sql = postgres(dbUrl);
      await sql`ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`;
      await sql`ALTER TABLE questions ADD COLUMN IF NOT EXISTS show_image BOOLEAN NOT NULL DEFAULT false`;
      await sql`ALTER TABLE questions ADD COLUMN IF NOT EXISTS round_number INTEGER NOT NULL DEFAULT 1`;
      await sql`ALTER TABLE questions ADD COLUMN IF NOT EXISTS display_number INTEGER NOT NULL DEFAULT 1`;
      await sql`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS round_number INTEGER NOT NULL DEFAULT 1`;
      await sql`ALTER TABLE admin_config ADD COLUMN IF NOT EXISTS active_round_number INTEGER NOT NULL DEFAULT 1`;

      // Remove desk_string column completely since we're no longer using desk locations
      await sql`ALTER TABLE questions DROP COLUMN IF EXISTS desk_string`;

      await sql.end();
      console.log("✓ Database migrations: Multi-day rounds support added, desk_string column removed");
    }
  } catch (e) {
    console.log("Migration (non-critical):", e);
  }

  // Create storage bucket for question images if it doesn't exist
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketName = 'make-0b818758-questions';
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, {
        public: false,
        fileSizeLimit: 5242880, // 5MB limit
      });
      console.log(`✓ Storage bucket created: ${bucketName}`);
    }
  } catch (e) {
    console.log("Storage bucket creation (non-critical):", e);
  }

  // No automatic seeding - admin will upload questions manually
  console.log("✓ Database ready for admin to upload questions");

  // Initialize admin_config with round 0 (empty) if it doesn't exist
  try {
    const { data: existingConfig } = await supabase
      .from('admin_config')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (!existingConfig) {
      await supabase
        .from('admin_config')
        .insert({
          admin_email: 'system@config',
          active_round_number: 0, // Start with empty round
        });
      console.log("✓ Admin config initialized with Empty round");
    }
  } catch (e) {
    console.log("Admin config initialization (non-critical):", e);
  }

  // Create admin user if doesn't exist
  try {
    const { data: adminUser } = await supabase.auth.admin.getUserByEmail(ADMIN_EMAIL);

    if (!adminUser?.user) {
      const { data: newAdmin } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: "admin123",
        email_confirm: true,
      });

      if (newAdmin?.user) {
        await supabase.from('profiles').insert({
          id: newAdmin.user.id,
          email: ADMIN_EMAIL,
          role: "admin",
          current_question: 1,
          last_submission_time: new Date().toISOString(),
        });
        console.log("Created admin user");
      }
    }
  } catch (e) {
    console.log("Admin user check:", e);
  }

  // Create test user if doesn't exist
  try {
    const testEmail = "user@google.com";
    const { data: testUser } = await supabase.auth.admin.getUserByEmail(testEmail);

    if (!testUser?.user) {
      const { data: newUser } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: "user123",
        email_confirm: true,
      });

      if (newUser?.user) {
        await supabase.from('profiles').insert({
          id: newUser.user.id,
          email: testEmail,
          role: "user",
          current_question: 1,
          last_submission_time: new Date().toISOString(),
        });
        console.log("Created test user");
      }
    }
  } catch (e) {
    console.log("Test user check:", e);
  }
}

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const path = new URL(req.url).pathname.replace("/make-server-0b818758", "");

  try {
    // Health check
    if (path === "/health") {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Signup - Create new user in Supabase Auth
    if (path === "/signup" && req.method === "POST") {
      const { email, password } = await req.json();

      if (!email?.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
        return new Response(JSON.stringify({ error: `Only ${ALLOWED_DOMAIN} emails allowed` }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create user in Supabase Auth
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (error) {
        // If user already exists, that's okay - they can just login
        if (error.message?.includes("already")) {
          return new Response(JSON.stringify({ ok: true, message: "User exists, please login" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create profile in database with proper role
      const role = getUserRole(email);
      await supabase.from('profiles').insert({
        id: data.user.id,
        email,
        role,
        current_question: 1,
        last_submission_time: new Date().toISOString(),
      });

      console.log(`New user signed up: ${email} (${role})`);

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Protected routes - require authentication
    // Read user token from custom header (not Authorization header to avoid ES256 rejection)
    const token = req.headers.get("x-user-token");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = decodeJWT(token);
    if (!user?.id) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check domain restriction
    if (!user.email?.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
      return new Response(JSON.stringify({ error: `Only ${ALLOWED_DOMAIN} allowed` }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get or create profile automatically on any authenticated request
    const profile = await getOrCreateProfile(user.id, user.email);

    if (!profile) {
      return new Response(JSON.stringify({ error: "Failed to create profile" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // /me - Get user profile and game state
    if (path === "/me") {
      // Get active round number
      const { data: config } = await supabase
        .from('admin_config')
        .select('active_round_number')
        .order('id', { ascending: false })
        .limit(1)
        .single();

      const activeRound = config?.active_round_number ?? 0;

      // Get total questions for active round (0 if empty round)
      let totalQuestions = 0;
      if (activeRound > 0) {
        const { count } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('round_number', activeRound);
        totalQuestions = count || 0;
      }

      // Get user's progress in active round
      const { count: correctCount } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('round_number', activeRound)
        .eq('is_correct', true);

      const currentDisplayNumber = (correctCount || 0) + 1;
      // Only mark as finished if there are questions AND user has completed them all
      const finished = (totalQuestions || 0) > 0 && (correctCount || 0) >= (totalQuestions || 0);

      console.log(`User ${user.email} - Round ${activeRound}: ${correctCount}/${totalQuestions} correct, finished: ${finished}`);

      return new Response(
        JSON.stringify({
          profile: {
            ...profile,
            current_display_number: currentDisplayNumber,
            correct_count: correctCount || 0,
          },
          activeRound,
          totalQuestions: totalQuestions || 0,
          finished,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // /question - Get current question for active round
    if (path === "/question") {
      // Get active round
      const { data: config } = await supabase
        .from('admin_config')
        .select('active_round_number')
        .order('id', { ascending: false })
        .limit(1)
        .single();

      const activeRound = config?.active_round_number ?? 0;

      // If round is 0 (empty), no questions available
      if (activeRound === 0) {
        return new Response(JSON.stringify({ question: null, finished: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get user's correct count for this round
      const { count: correctCount } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('round_number', activeRound)
        .eq('is_correct', true);

      const nextDisplayNumber = (correctCount || 0) + 1;

      // Fetch the question for this round and display number
      const { data: question } = await supabase
        .from('questions')
        .select('id, image_url, show_image, round_number, display_number')
        .eq('round_number', activeRound)
        .eq('display_number', nextDisplayNumber)
        .single();

      if (!question) {
        // No more questions for this round
        return new Response(JSON.stringify({ question: null, finished: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // For users, only include image if show_image is true
      // For admins, always include image
      let imageData = null;
      const isAdmin = profile.role === 'admin';

      if (question.image_url && (isAdmin || question.show_image)) {
        try {
          const bucketName = 'make-0b818758-questions';
          const { data: signedUrlData } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(question.image_url, 3600); // 1 hour expiry

          if (signedUrlData) {
            imageData = signedUrlData.signedUrl;
          }
        } catch (e) {
          console.error("Error creating signed URL:", e);
        }
      }

      return new Response(JSON.stringify({
        question: {
          id: question.id,
          image_url: imageData,
          show_image: question.show_image,
          display_number: question.display_number, // CRITICAL: Send display number, not id
          round_number: question.round_number,
        },
        finished: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // /submit - Submit answer
    if (path === "/submit" && req.method === "POST") {
      const { answer } = await req.json();

      // Rate limiting: Check submission count in last 1 minute (max 10 submissions/minute)
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
      const { count: submissionCount, error: submissionCountError } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('submitted_at', oneMinuteAgo);

      if (submissionCountError) {
        console.error('Rate limit check error:', submissionCountError);
      } else if (submissionCount !== null && submissionCount >= 10) {
        console.log(`Rate limit exceeded for ${user.email}: ${submissionCount} submissions in last minute`);
        return new Response(JSON.stringify({
          correct: false,
          rateLimited: true,
          message: "Too many submissions. Please wait before trying again.",
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get active round
      const { data: config } = await supabase
        .from('admin_config')
        .select('active_round_number')
        .order('id', { ascending: false })
        .limit(1)
        .single();

      const activeRound = config?.active_round_number ?? 0;

      // Reject submissions if no round is active
      if (activeRound === 0) {
        return new Response(JSON.stringify({
          correct: false,
          error: "No round is currently active"
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get user's current progress in this round
      const { count: correctCount } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('round_number', activeRound)
        .eq('is_correct', true);

      const currentDisplayNumber = (correctCount || 0) + 1;

      // Get the current question they're attempting
      const { data: currentQuestion } = await supabase
        .from('questions')
        .select('id')
        .eq('round_number', activeRound)
        .eq('display_number', currentDisplayNumber)
        .single();

      if (!currentQuestion) {
        return new Response(JSON.stringify({
          correct: false,
          error: "No question available for this round"
        }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get valid answers for this question
      const { data: answers } = await supabase
        .from('answer_pool')
        .select('answer')
        .eq('question_id', currentQuestion.id);

      // Check if answer is correct (case-insensitive, no spaces)
      const normalized = answer?.toLowerCase().replace(/\s+/g, "");
      const isCorrect = answers?.some((a: any) =>
        a.answer.toLowerCase().replace(/\s+/g, "") === normalized
      );

      // Record submission (APPEND-ONLY - this is the source of truth)
      await supabase.from('submissions').insert({
        user_id: user.id,
        question_id: currentQuestion.id,
        round_number: activeRound, // CRITICAL: Include round number
        submitted_answer: answer,
        is_correct: isCorrect,
      });

      if (!isCorrect) {
        console.log(`Wrong answer from ${user.email} for Round ${activeRound}, Q${currentDisplayNumber}`);
        return new Response(JSON.stringify({ correct: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Note: We do NOT update the profile table anymore
      // Progress is calculated dynamically from the submissions table
      console.log(`Correct answer from ${user.email} for Round ${activeRound}, Q${currentDisplayNumber}`);

      return new Response(JSON.stringify({ correct: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // /leaderboard - Get DAILY leaderboard for active round only
    if (path === "/leaderboard") {
      // Get active round
      const { data: config } = await supabase
        .from('admin_config')
        .select('active_round_number')
        .order('id', { ascending: false })
        .limit(1)
        .single();

      const activeRound = config?.active_round_number ?? 0;

      // Get all users with their progress in the ACTIVE round
      const { data: leaderboardData } = await supabase
        .from('profiles')
        .select('id, email, role')
        .neq('role', 'admin');

      if (!leaderboardData) {
        return new Response(JSON.stringify({ leaderboard: [], activeRound }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // For each user, count their correct submissions in the active round
      const leaderboardPromises = leaderboardData.map(async (user: any) => {
        const { count: correctCount, data: submissions } = await supabase
          .from('submissions')
          .select('submitted_at', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('round_number', activeRound)
          .eq('is_correct', true)
          .order('submitted_at', { ascending: false })
          .limit(1);

        const lastCorrectTime = submissions && submissions.length > 0
          ? submissions[0].submitted_at
          : null;

        return {
          id: user.id,
          name: user.email.split("@")[0],
          correct_count: correctCount || 0,
          last_correct_time: lastCorrectTime,
        };
      });

      const leaderboard = await Promise.all(leaderboardPromises);

      // Sort by correct count (desc), then by last correct time (asc)
      leaderboard.sort((a, b) => {
        if (b.correct_count !== a.correct_count) {
          return b.correct_count - a.correct_count;
        }
        // If counts are equal, earlier completion time wins
        if (!a.last_correct_time) return 1;
        if (!b.last_correct_time) return -1;
        return new Date(a.last_correct_time).getTime() - new Date(b.last_correct_time).getTime();
      });

      console.log(`Daily leaderboard for Round ${activeRound}: ${leaderboard.length} users`);

      return new Response(JSON.stringify({
        leaderboard,
        activeRound,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // /announcements - Get all announcements (or only active for users)
    if (path === "/announcements" && req.method === "GET") {
      const showAll = profile.role === "admin";

      let query = supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      // Check if is_active column exists
      const { error: columnCheckError } = await supabase
        .from('announcements')
        .select('is_active')
        .limit(0)
        .single();

      // Users only see active announcements (if column exists)
      if (!showAll && !columnCheckError) {
        query = query.eq('is_active', true);
      }

      const { data: announcements } = await query;

      return new Response(JSON.stringify({ announcements: announcements || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // /announcements - Create announcement (admin only)
    if (path === "/announcements" && req.method === "POST") {
      if (profile.role !== "admin") {
        return new Response(JSON.stringify({ error: "Admin only" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { message } = await req.json();

      // Try with is_active first, fallback to without if column doesn't exist
      let ann, annError;
      const insertData: any = { message, created_by: user.id };

      // Check if is_active column exists by trying to select it
      const { error: columnCheckError } = await supabase
        .from('announcements')
        .select('is_active')
        .limit(0)
        .single();

      if (!columnCheckError) {
        insertData.is_active = true;
      }

      const result = await supabase
        .from('announcements')
        .insert(insertData)
        .select()
        .single();

      ann = result.data;
      annError = result.error;

      if (annError) {
        console.error("Announcement creation error:", annError);
        return new Response(JSON.stringify({ error: "Failed to create announcement" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const channel = supabase.channel("announcements");
      await channel.send({ type: "broadcast", event: "new", payload: ann });

      console.log(`Announcement created by ${user.email}`);

      return new Response(JSON.stringify({ ok: true, announcement: ann }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // /announcements - Update announcement (admin only)
    if (path === "/announcements" && req.method === "PUT") {
      if (profile.role !== "admin") {
        return new Response(JSON.stringify({ error: "Admin only" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { id, message, is_active } = await req.json();

      const updateData: any = {};
      if (message !== undefined) updateData.message = message;

      // Only add is_active if column exists
      if (is_active !== undefined) {
        const { error: columnCheckError } = await supabase
          .from('announcements')
          .select('is_active')
          .limit(0)
          .single();

        if (!columnCheckError) {
          updateData.is_active = is_active;
        } else {
          console.warn("⚠️ is_active column doesn't exist yet. Run migration SQL.");
        }
      }

      const { data: updated, error: updateError } = await supabase
        .from('announcements')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error("Announcement update error:", updateError);
        return new Response(JSON.stringify({ error: "Failed to update announcement" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Admin ${user.email} updated announcement ${id}`);

      return new Response(JSON.stringify({ ok: true, announcement: updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // /announcements - Delete announcement (admin only)
    if (path === "/announcements" && req.method === "DELETE") {
      if (profile.role !== "admin") {
        return new Response(JSON.stringify({ error: "Admin only" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { id } = await req.json();

      const { error: deleteError } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error("Announcement deletion error:", deleteError);
        return new Response(JSON.stringify({ error: "Failed to delete announcement" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Admin ${user.email} deleted announcement ${id}`);

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // /admin/answers - Get all questions with their valid answers (admin only)
    if (path === "/admin/answers" && req.method === "GET") {
      if (profile.role !== "admin") {
        return new Response(JSON.stringify({ error: "Admin only" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: questions } = await supabase
        .from('questions')
        .select('id, image_url, show_image, round_number, display_number')
        .order('round_number', { ascending: true })
        .order('display_number', { ascending: true });

      const questionsWithAnswers = await Promise.all(
        (questions || []).map(async (q: any) => {
          const { data: answers } = await supabase
            .from('answer_pool')
            .select('answer')
            .eq('question_id', q.id);

          // Get signed URL for image if it exists
          let signedImageUrl = null;
          if (q.image_url) {
            try {
              const bucketName = 'make-0b818758-questions';
              const { data: signedUrlData } = await supabase.storage
                .from(bucketName)
                .createSignedUrl(q.image_url, 3600);

              if (signedUrlData) {
                signedImageUrl = signedUrlData.signedUrl;
              }
            } catch (e) {
              console.error("Error creating signed URL:", e);
            }
          }

          return {
            id: q.id,
            image_url: signedImageUrl,
            show_image: q.show_image ?? true,
            round_number: q.round_number || 1,
            display_number: q.display_number || 1,
            answers: answers?.map((a: any) => a.answer) || [],
          };
        })
      );

      return new Response(JSON.stringify({ questions: questionsWithAnswers }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // /admin/answers - Update valid answers for a question (admin only)
    if (path === "/admin/answers" && req.method === "POST") {
      if (profile.role !== "admin") {
        return new Response(JSON.stringify({ error: "Admin only" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { question_id, answers } = await req.json();

      // Delete existing answers for this question
      await supabase
        .from('answer_pool')
        .delete()
        .eq('question_id', question_id);

      // Insert new answers
      if (answers && answers.length > 0) {
        await supabase
          .from('answer_pool')
          .insert(
            answers.map((answer: string) => ({
              question_id,
              answer,
            }))
          );
      }

      console.log(`Admin ${user.email} updated answers for question ${question_id}`);

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // /admin/reset - Reset all user progress for a new round (admin only)
    if (path === "/admin/reset" && req.method === "POST") {
      if (profile.role !== "admin") {
        return new Response(JSON.stringify({ error: "Admin only" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Reset all users back to question 1
      await supabase
        .from('profiles')
        .update({
          current_question: 1,
          last_submission_time: new Date().toISOString()
        })
        .neq('role', 'admin'); // Don't reset admin

      // IMPORTANT: DO NOT DELETE SUBMISSIONS - submissions table is append-only audit log
      // Submission history must be preserved for all rounds
      // Progress is calculated dynamically from submissions table by filtering on round_number

      console.log(`Admin ${user.email} reset all user progress (submission history preserved)`);

      return new Response(JSON.stringify({ ok: true, message: "All user progress reset successfully" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // /admin/round - Get active round number (admin only)
    if (path === "/admin/round" && req.method === "GET") {
      if (profile.role !== "admin") {
        return new Response(JSON.stringify({ error: "Admin only" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: config } = await supabase
        .from('admin_config')
        .select('active_round_number')
        .order('id', { ascending: false })
        .limit(1)
        .single();

      const activeRound = config?.active_round_number ?? 0;

      return new Response(JSON.stringify({ active_round_number: activeRound }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // /admin/round - Set active round number (admin only)
    if (path === "/admin/round" && req.method === "PUT") {
      if (profile.role !== "admin") {
        return new Response(JSON.stringify({ error: "Admin only" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { round_number, admin_password } = await req.json();

      // Validate password
      if (!admin_password || admin_password !== "admin123") {
        return new Response(JSON.stringify({ error: "Invalid password" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Allow round 0 for "Empty" state (no round active)
      if (round_number === undefined || round_number === null || round_number < 0) {
        return new Response(JSON.stringify({ error: "Valid round number required (>= 0)" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update the active round in admin_config
      const { data: config } = await supabase
        .from('admin_config')
        .select('id')
        .order('id', { ascending: false })
        .limit(1)
        .single();

      if (config) {
        await supabase
          .from('admin_config')
          .update({ active_round_number: round_number })
          .eq('id', config.id);
      } else {
        // Create initial config if it doesn't exist
        await supabase
          .from('admin_config')
          .insert({
            admin_email: 'system@config',
            active_round_number: round_number,
          });
      }

      console.log(`Admin ${user.email} set active round to ${round_number}`);

      // Broadcast round change via Supabase Realtime
      await supabase.channel('round-updates').send({
        type: 'broadcast',
        event: 'round_changed',
        payload: { round_number },
      });

      return new Response(JSON.stringify({ ok: true, active_round_number: round_number }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // /admin/questions - Create a new question (admin only)
    if (path === "/admin/questions" && req.method === "POST") {
      console.log("Hit /admin/questions endpoint");
      if (profile.role !== "admin") {
        console.log("User is not admin:", profile.role);
        return new Response(JSON.stringify({ error: "Admin only" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { answers, image_base64, image_type, round_number, display_number } = await req.json();
      console.log("Creating question - Round:", round_number, "Display:", display_number);

      if (!image_base64 || !image_type) {
        return new Response(JSON.stringify({ error: "Question image is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!answers || answers.length === 0 || !round_number || !display_number) {
        return new Response(JSON.stringify({ error: "Round number, display number, and at least one answer required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get the next question ID
      const { data: maxIdData, error: maxIdError } = await supabase
        .from('questions')
        .select('id')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle(); // Use maybeSingle instead of single to handle empty table

      const nextId = (maxIdData?.id || 0) + 1;
      console.log(`Next question ID will be: ${nextId}`);

      // Handle image upload - REQUIRED
      let imageUrl = null;
      try {
        const bucketName = 'make-0b818758-questions';
        const fileName = `question_${nextId}_${Date.now()}.${image_type.split('/')[1] || 'png'}`;

        // Convert base64 to binary
        const base64Data = image_base64.split(',')[1] || image_base64;
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(fileName, binaryData, {
            contentType: image_type,
            upsert: false,
          });

        if (uploadError) {
          console.error("Image upload error:", uploadError);
          return new Response(JSON.stringify({ error: `Failed to upload image: ${uploadError.message}` }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        imageUrl = fileName;
        console.log(`Image uploaded: ${fileName}`);
      } catch (e) {
        console.error("Image processing error:", e);
        return new Response(JSON.stringify({ error: "Failed to process image" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create the question
      const { data: newQuestion, error: questionError } = await supabase
        .from('questions')
        .insert({
          id: nextId,
          image_url: imageUrl,
          show_image: true, // Default to showing
          round_number: round_number,
          display_number: display_number,
        })
        .select()
        .single();

      if (questionError) {
        console.error("Question creation error:", questionError);
        return new Response(JSON.stringify({ error: `Failed to create question: ${questionError.message}` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Add the answers
      await supabase
        .from('answer_pool')
        .insert(
          answers.map((answer: string) => ({
            question_id: nextId,
            answer,
          }))
        );

      console.log(`Admin ${user.email} created new question ${nextId} for Round ${round_number}, Display #${display_number}`);

      return new Response(JSON.stringify({ ok: true, question: newQuestion }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // /admin/questions - Delete a question (admin only)
    if (path === "/admin/questions" && req.method === "DELETE") {
      if (profile.role !== "admin") {
        return new Response(JSON.stringify({ error: "Admin only" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { question_id } = await req.json();

      if (!question_id) {
        return new Response(JSON.stringify({ error: "Question ID required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete associated answers first
      await supabase
        .from('answer_pool')
        .delete()
        .eq('question_id', question_id);

      // IMPORTANT: DO NOT DELETE SUBMISSIONS - submissions table is append-only audit log
      // Submission history must be preserved even when questions are deleted

      // Delete the question
      const { error: deleteError } = await supabase
        .from('questions')
        .delete()
        .eq('id', question_id);

      if (deleteError) {
        console.error("Question deletion error:", deleteError);
        return new Response(JSON.stringify({ error: "Failed to delete question" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Admin ${user.email} deleted question ${question_id}`);

      return new Response(JSON.stringify({ ok: true, message: "Question deleted successfully" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // /admin/questions - Toggle show_image for a question (admin only)
    if (path === "/admin/questions" && req.method === "PUT") {
      if (profile.role !== "admin") {
        return new Response(JSON.stringify({ error: "Admin only" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { question_id, show_image } = await req.json();

      if (!question_id || show_image === undefined) {
        return new Response(JSON.stringify({ error: "Question ID and show_image status required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: updateError } = await supabase
        .from('questions')
        .update({ show_image })
        .eq('id', question_id);

      if (updateError) {
        console.error("Question update error:", updateError);
        return new Response(JSON.stringify({ error: "Failed to update question" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Admin ${user.email} set show_image=${show_image} for question ${question_id}`);

      return new Response(JSON.stringify({ ok: true, message: "Question updated successfully" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // /admin/promote - This endpoint is blocked now, only admin@google.com gets admin role
    if (path === "/admin/promote" && req.method === "POST") {
      return new Response(
        JSON.stringify({
          error: "Admin promotion disabled. Only admin@google.com has admin access."
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("No route matched. Path:", path, "Method:", req.method);
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

console.log("Initializing server...");
await initDatabase();
console.log("Server ready!");
console.log(`Admin: ${ADMIN_EMAIL} (hardcoded admin access)`);

serve(handler);
