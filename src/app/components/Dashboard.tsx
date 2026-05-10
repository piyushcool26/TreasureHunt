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
  current_question: number;
};

type Announcement = { id: string; message: string; created_at: string; is_active: boolean };

type QuestionData = {
  id: number;
  desk_string: string;
  image_url: string | null;
  show_image: boolean;
};

export function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [finished, setFinished] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activeAnn, setActiveAnn] = useState<Announcement | null>(null);
  const [questionData, setQuestionData] = useState<QuestionData | null>(null);

  const refresh = useCallback(async () => {
    try {
      const me = await apiFetch("/me", {}, token);
      setProfile(me.profile);
      setTotalQuestions(me.totalQuestions);

      // Check if finished
      const isFinished = me.profile.current_question > me.totalQuestions;
      setFinished(isFinished);

      // Fetch current question data if not finished
      if (!isFinished) {
        try {
          const questionRes = await apiFetch("/question", {}, token);
          if (questionRes.question) {
            setQuestionData(questionRes.question);
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
      setLeaderboard(lb.leaderboard);
      setAnnouncements(ann.announcements);
      // Set active announcement to latest active one
      const latestActive = ann.announcements.find((a: Announcement) => a.is_active);
      setActiveAnn(latestActive || null);
    } catch (e) {
      console.error("Dashboard refresh error:", e);
    }
  }, [token]);

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
    const id = setInterval(() => {
      apiFetch("/leaderboard", {}, token)
        .then((lb) => setLeaderboard(lb.leaderboard))
        .catch((e) => console.error("Leaderboard poll error:", e));
    }, 10000);
    return () => clearInterval(id);
  }, [token]);

  async function handleSubmit(answer: string): Promise<boolean> {
    try {
      const res = await apiFetch(
        "/submit",
        { method: "POST", body: JSON.stringify({ answer }) },
        token,
      );
      if (res.correct) {
        await refresh();
        return true;
      }
      return false;
    } catch (e) {
      console.error("Submit error:", e);
      return false;
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
                  Manage announcements, edit answers, and view game progress. Questions are distributed in person.
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
              {finished ? (
                <Congrats name={namePrefix} />
              ) : (
                <AnswerSubmission
                  currentQuestion={profile.current_question}
                  totalQuestions={totalQuestions}
                  onSubmit={handleSubmit}
                  questionImage={questionData?.image_url || null}
                />
              )}
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
