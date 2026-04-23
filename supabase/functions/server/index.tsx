import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import postgres from "https://deno.land/x/postgresjs@v3.4.3/mod.js";

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
const ALLOWED_DOMAIN = "@google.com"; // For password signup only, OTP allows any domain

// TEMPORARY: Test email for OTP functionality
const OTP_TEST_EMAIL = "112516077@ece.iiitp.ac.in"; // TODO: Remove after OTP testing

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
  // Run migrations - Add is_active column to announcements if it doesn't exist
  try {
    const dbUrl = Deno.env.get("SUPABASE_DB_URL");
    if (dbUrl) {
      const sql = postgres(dbUrl);
      await sql`ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`;
      await sql.end();
      console.log("✓ Database migration: is_active column added to announcements");
    }
  } catch (e) {
    console.log("Migration (non-critical):", e);
  }

  // Seed questions if empty
  const { data: existingQuestions } = await supabase
    .from('questions')
    .select('id')
    .limit(1);

  if (!existingQuestions?.length) {
    await supabase.from('questions').insert([
      { id: 1, desk_string: 'Desk 402-B', image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800' },
      { id: 2, desk_string: 'Desk 215-A', image_url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800' },
      { id: 3, desk_string: 'Desk 108-C', image_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800' },
    ]);

    await supabase.from('answer_pool').insert([
      { question_id: 1, answer: 'circuit' },
      { question_id: 1, answer: 'chip' },
      { question_id: 2, answer: 'keyboard' },
      { question_id: 3, answer: 'chart' },
      { question_id: 3, answer: 'graph' },
      { question_id: 3, answer: 'analytics' },
    ]);

    console.log("Seeded questions and answers");
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

    // Check domain restriction (skip for OTP users who may have any email)
    // We allow any email to authenticate via OTP, but password signup is restricted to @google.com
    const isPasswordUser = user.email?.toLowerCase().endsWith(ALLOWED_DOMAIN);
    const isOtpTestUser = user.email?.toLowerCase() === OTP_TEST_EMAIL.toLowerCase();

    // Allow: @google.com users, OTP test user, or any OTP authenticated users
    if (!isPasswordUser && !isOtpTestUser) {
      console.log(`OTP user allowed: ${user.email}`);
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
      const { count: totalQuestions } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true });

      return new Response(
        JSON.stringify({ profile, totalQuestions }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // /question - Get current question
    if (path === "/question") {
      const { data: question } = await supabase
        .from('questions')
        .select('id, desk_string, image_url')
        .eq('id', profile.current_question)
        .single();

      if (!question) {
        return new Response(JSON.stringify({ question: null, finished: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ question, finished: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // /submit - Submit answer
    if (path === "/submit" && req.method === "POST") {
      const { answer } = await req.json();

      // Get valid answers for current question
      const { data: answers } = await supabase
        .from('answer_pool')
        .select('answer')
        .eq('question_id', profile.current_question);

      // Check if answer is correct (case-insensitive, no spaces)
      const normalized = answer?.toLowerCase().replace(/\s+/g, "");
      const isCorrect = answers?.some((a: any) =>
        a.answer.toLowerCase().replace(/\s+/g, "") === normalized
      );

      // Record submission
      await supabase.from('submissions').insert({
        user_id: user.id,
        question_id: profile.current_question,
        submitted_answer: answer,
        is_correct: isCorrect,
      });

      if (!isCorrect) {
        console.log(`Wrong answer from ${user.email}: "${answer}"`);
        return new Response(JSON.stringify({ correct: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update progress
      const { data: updated } = await supabase
        .from('profiles')
        .update({
          current_question: profile.current_question + 1,
          last_submission_time: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      console.log(`Correct answer from ${user.email}`);

      return new Response(JSON.stringify({ correct: true, profile: updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // /leaderboard - Get all users ranked (exclude admins)
    if (path === "/leaderboard") {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, current_question, last_submission_time, role')
        .neq('role', 'admin')
        .order('current_question', { ascending: false })
        .order('last_submission_time', { ascending: true });

      console.log(`Leaderboard query returned ${profiles?.length || 0} profiles (excluding admins)`);

      // Double-check: filter out any admin that might have slipped through
      const nonAdminProfiles = profiles?.filter((p: any) => p.role !== 'admin') || [];

      const rows = nonAdminProfiles.map((p: any) => ({
        id: p.id,
        name: p.email.split("@")[0],
        current_question: p.current_question,
      }));

      console.log(`Sending ${rows.length} users to leaderboard`);

      return new Response(JSON.stringify({ leaderboard: rows }), {
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
        .select('id, desk_string')
        .order('id');

      const questionsWithAnswers = await Promise.all(
        (questions || []).map(async (q: any) => {
          const { data: answers } = await supabase
            .from('answer_pool')
            .select('answer')
            .eq('question_id', q.id);

          return {
            id: q.id,
            desk_string: q.desk_string,
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

      // Clear all submissions
      await supabase
        .from('submissions')
        .delete()
        .neq('user_id', '00000000-0000-0000-0000-000000000000'); // Delete all (dummy condition)

      console.log(`Admin ${user.email} reset all user progress for new round`);

      return new Response(JSON.stringify({ ok: true, message: "All user progress reset successfully" }), {
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

      const { desk_string, answers } = await req.json();
      console.log("Creating question:", desk_string, "with answers:", answers);

      if (!desk_string || !answers || answers.length === 0) {
        return new Response(JSON.stringify({ error: "Desk location and at least one answer required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get the next question ID
      const { data: maxIdData } = await supabase
        .from('questions')
        .select('id')
        .order('id', { ascending: false })
        .limit(1)
        .single();

      const nextId = (maxIdData?.id || 0) + 1;

      // Create the question
      const { data: newQuestion, error: questionError } = await supabase
        .from('questions')
        .insert({
          id: nextId,
          desk_string,
          image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800',
        })
        .select()
        .single();

      if (questionError) {
        console.error("Question creation error:", questionError);
        return new Response(JSON.stringify({ error: "Failed to create question" }), {
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

      console.log(`Admin ${user.email} created new question ${nextId}: ${desk_string}`);

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

      // Delete associated submissions
      await supabase
        .from('submissions')
        .delete()
        .eq('question_id', question_id);

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
