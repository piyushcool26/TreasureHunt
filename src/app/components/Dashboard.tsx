import { useEffect, useState, useCallback } from "react";
import { LogOut } from "lucide-react";
import { supabase, apiFetch } from "../lib/supabase";
import { AnswerSubmission } from "./AnswerSubmission";
import { Leaderboard } from "./Leaderboard";
import { AnnouncementBanner } from "./AnnouncementBanner";
import { Congrats } from "./Congrats";
import { AdminPanel } from "./AdminPanel";
import { ParticleBackground } from "./ParticleBackground";
import { AnnouncementsWidget } from "./AnnouncementsWidget";

type Profile = {
  id: string;
  email: string;
  role: string;
  current_display_number?: number;
  correct_count?: number;
};

type Announcement = { id: string; message: string; created_at: string; is_active: boolean };

type QuestionData = {
  id: number;
  desk_string: string;
  image_url: string | null;
  show_image: boolean;
  display_number: number;
  round_number: number;
};

export function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [finished, setFinished] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activeAnn, setActiveAnn] = useState<Announcement | null>(null);
  const [questionData, setQuestionData] = useState<QuestionData | null>(null);
  const [activeRound, setActiveRound] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const me = await apiFetch("/me", {}, token);
      setProfile(me.profile);
      setTotalQuestions(me.totalQuestions || 0);
      setActiveRound(me.activeRound ?? 0);
      setFinished(me.finished || false);

      // Fetch current question data if not finished
      if (!me.finished) {
        try {
          const questionRes = await apiFetch("/question", {}, token);
          if (questionRes.question) {
            setQuestionData(questionRes.question);
          } else {
            // No question available but not marked as finished - check if user has completed all questions
            if (questionRes.finished || (me.totalQuestions > 0 && me.profile.correct_count >= me.totalQuestions)) {
              setFinished(true);
            }
          }
        } catch (e) {
          console.error("Failed to fetch question:", e);
        }
      }

      const [lb, ann] = await Promise.all([
        apiFetch("/leaderboard", {}, token),
        apiFetch("/announcements", {}, token),
      ]);

      console.log("Leaderboard data received:", lb.leaderboard);
      setLeaderboard(lb.leaderboard || []);
      setActiveRound(lb.activeRound ?? 0);
      setAnnouncements(ann.announcements);
      // Set active announcement to latest active one
      const latestActive = ann.announcements.find((a: Announcement) => a.is_active);
      setActiveAnn(latestActive || null);
    } catch (e) {
      console.error("Dashboard refresh error:", e);
    }
  }, [token, activeRound]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime announcements
  useEffect(() => {
    const channel = supabase.channel("announcements");
    channel
      .on("broadcast", { event: "new" }, (payload) => {
        const ann = payload.payload as Announcement;
        setAnnouncements((prev) => [ann, ...prev]);
        setActiveAnn(ann);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Realtime question updates - refresh question data when it changes
  useEffect(() => {
    if (!profile || finished) return;

    const channel = supabase
      .channel('questions-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'questions',
          filter: `id=eq.${profile.current_question}`,
        },
        async () => {
          // Re-fetch question data when it's updated
          try {
            const questionRes = await apiFetch("/question", {}, token);
            if (questionRes.question) {
              setQuestionData(questionRes.question);
            }
          } catch (e) {
            console.error("Failed to refresh question:", e);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, finished, token]);

  // Periodic leaderboard refresh
  useEffect(() => {
    if (!token || !profile) return;

    let failureCount = 0;
    const MAX_FAILURES = 3;

    const pollLeaderboard = async () => {
      try {
        const lb = await apiFetch("/leaderboard", {}, token);
        if (lb?.leaderboard) {
          setLeaderboard(lb.leaderboard);
          failureCount = 0; // Reset on success
        }
      } catch (e) {
        failureCount++;

        // Silently handle network errors during polling
        if (e instanceof TypeError && e.message === "Failed to fetch") {
          // Network error - only log if persistent
          if (failureCount >= MAX_FAILURES) {
            console.warn("Leaderboard polling: persistent network issues detected");
          }
          return;
        }

        // Log other types of errors
        if (e instanceof Error && !e.message.includes("timeout")) {
          console.error("Leaderboard poll error:", e);
        }
      }
    };

    // Initial poll
    pollLeaderboard();

    // Set up interval - refresh every 1 minute
    const id = setInterval(pollLeaderboard, 60000);

    return () => clearInterval(id);
  }, [token, profile]);

  async function handleSubmit(answer: string): Promise<{ correct: boolean; rateLimited?: boolean; message?: string }> {
    try {
      const res = await apiFetch(
        "/submit",
        { method: "POST", body: JSON.stringify({ answer }) },
        token,
      );
      if (res.correct) {
        // Small delay to ensure database has committed the transaction
        await new Promise(resolve => setTimeout(resolve, 500));
        await refresh();
        return { correct: true };
      }
      if (res.rateLimited) {
        return { correct: false, rateLimited: true, message: res.message };
      }
      return { correct: false };
    } catch (e: any) {
      // Handle rate limit errors (429 status)
      if (e?.message?.includes("429") || e?.message?.includes("Too many")) {
        return { correct: false, rateLimited: true, message: "Too many submissions. Please wait before trying again." };
      }
      console.error("Submit error:", e);
      return { correct: false };
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    onLogout();
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const namePrefix = profile.email.split("@")[0];
  const isAdmin = profile.role === "admin";

  return (
    <div className="min-h-screen bg-[#F8F9FA] relative">
      <ParticleBackground />
      <AnnouncementBanner announcement={activeAnn} />
      {!isAdmin && <AnnouncementsWidget announcements={announcements} />}

      <nav className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            <span className="text-[#4285F4]">G</span>
            <span className="text-[#EA4335]">o</span>
            <span className="text-[#FBBC05]">o</span>
            <span className="text-[#4285F4]">g</span>
            <span className="text-[#34A853]">l</span>
            <span className="text-[#EA4335]">e</span>
          </div>
          <span className="text-gray-400">|</span>
          <span className="text-gray-800">Treasure Hunt</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{namePrefix}</span>
          {isAdmin && (
            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-lg font-medium">
              Admin
            </span>
          )}
          <button
            onClick={logout}
            className="p-2 rounded-lg text-gray-500 hover:text-[#EA4335] hover:bg-red-50 transition"
          >
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        {isAdmin ? (
          // Admin View: Admin panel + leaderboard
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
            <div className="lg:col-span-7">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
                <p className="text-gray-600">
                  Manage announcements, edit answers, and view game progress.
                </p>
              </div>
              <AdminPanel token={token} announcements={announcements} onRefresh={refresh} />
            </div>
            <div className="lg:col-span-3">
              <Leaderboard rows={leaderboard} currentUserId={profile.id} />
            </div>
          </div>
        ) : (
          // User View: Answer submission + leaderboard - no question display
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
            <div className="lg:col-span-7">
              {(() => {
                if (activeRound === 0 || totalQuestions === 0) {
                  return (
                    // No round active or no questions available yet
                    <div className="bg-white rounded-3xl shadow-2xl p-12 border border-gray-100 text-center">
                      <div className="max-w-md mx-auto">
                        <div className="mb-6">
                          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-[#4285F4] to-[#34A853] flex items-center justify-center">
                            <span className="text-5xl">🕐</span>
                          </div>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">The round is yet to start</h2>
                        <p className="text-gray-600 text-lg">
                          {activeRound === 0
                            ? "No round is currently active. Please check back soon!"
                            : `Questions for Round ${activeRound} haven't been uploaded yet. Please check back soon!`
                          }
                        </p>
                      </div>
                    </div>
                  );
                } else if (finished) {
                  return <Congrats name={namePrefix} roundNumber={activeRound} />;
                } else {
                  return (
                    <AnswerSubmission
                      currentQuestion={questionData?.display_number || 1}
                      totalQuestions={totalQuestions}
                      onSubmit={handleSubmit}
                      questionImage={questionData?.image_url || null}
                      roundNumber={activeRound}
                    />
                  );
                }
              })()}
            </div>
            <div className="lg:col-span-3">
              <Leaderboard rows={leaderboard} currentUserId={profile.id} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
