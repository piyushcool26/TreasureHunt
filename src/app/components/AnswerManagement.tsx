import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X, Save, FileQuestion, Trash2, AlertTriangle, Image, Eye, EyeOff } from "lucide-react";
import { apiFetch } from "../lib/supabase";

type Question = {
  id: number;
  desk_string: string;
  image_url: string | null;
  show_image: boolean;
  round_number: number;
  display_number: number;
  answers: string[];
};

export function AnswerManagement({ token }: { token: string }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<number | null>(null);
  const [newAnswers, setNewAnswers] = useState<{ [key: number]: string }>({});
  const [showNewQuestion, setShowNewQuestion] = useState(false);
  const [newQuestionDesk, setNewQuestionDesk] = useState("");
  const [newQuestionAnswers, setNewQuestionAnswers] = useState<string[]>([]);
  const [tempAnswer, setTempAnswer] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageType, setSelectedImageType] = useState<string | null>(null);
  const [togglingImage, setTogglingImage] = useState<number | null>(null);
  const [newQuestionRound, setNewQuestionRound] = useState(1);
  const [newQuestionDisplay, setNewQuestionDisplay] = useState(1);

  useEffect(() => {
    loadQuestions();
  }, []);

  async function loadQuestions() {
    try {
      const data = await apiFetch("/admin/answers", {}, token);
      setQuestions(data.questions);
    } catch (e) {
      console.error("Failed to load questions:", e);
    } finally {
      setLoading(false);
    }
  }

  async function saveAnswers(questionId: number, answers: string[]) {
    setSaving(true);
    try {
      await apiFetch(
        "/admin/answers",
        {
          method: "POST",
          body: JSON.stringify({ question_id: questionId, answers }),
        },
        token
      );
      await loadQuestions();
      setEditingQuestion(null);
      setNewAnswers({});
    } catch (e) {
      console.error("Failed to save answers:", e);
      alert("Failed to save answers");
    } finally {
      setSaving(false);
    }
  }

  function addAnswer(questionId: number, answer: string) {
    const question = questions.find((q) => q.id === questionId);
    if (question) {
      saveAnswers(questionId, [...question.answers, answer]);
    }
  }

  function removeAnswer(questionId: number, answer: string) {
    const question = questions.find((q) => q.id === questionId);
    if (question) {
      saveAnswers(
        questionId,
        question.answers.filter((a) => a !== answer)
      );
    }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert("Image must be less than 5MB");
        return;
      }

      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setSelectedImageType(file.type);
      };
      reader.readAsDataURL(file);
    }
  }

  async function createNewQuestion() {
    if (!newQuestionDesk.trim() || newQuestionAnswers.length === 0) {
      alert("Please provide a desk location and at least one answer");
      return;
    }

    if (newQuestionRound < 1 || newQuestionDisplay < 1) {
      alert("Round number and display number must be at least 1");
      return;
    }

    setSaving(true);
    try {
      await apiFetch(
        "/admin/questions",
        {
          method: "POST",
          body: JSON.stringify({
            desk_string: newQuestionDesk.trim(),
            answers: newQuestionAnswers,
            image_base64: selectedImage,
            image_type: selectedImageType,
            round_number: newQuestionRound,
            display_number: newQuestionDisplay,
          }),
        },
        token
      );
      await loadQuestions();
      setShowNewQuestion(false);
      setNewQuestionDesk("");
      setNewQuestionAnswers([]);
      setTempAnswer("");
      setSelectedImage(null);
      setSelectedImageType(null);
      setNewQuestionRound(1);
      setNewQuestionDisplay(1);
    } catch (e) {
      console.error("Failed to create question:", e);
      alert("Failed to create question: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  }

  async function toggleShowImage(questionId: number, currentState: boolean) {
    setTogglingImage(questionId);
    try {
      await apiFetch(
        "/admin/questions",
        {
          method: "PUT",
          body: JSON.stringify({
            question_id: questionId,
            show_image: !currentState,
          }),
        },
        token
      );
      await loadQuestions();
    } catch (e) {
      console.error("Failed to toggle image display:", e);
      alert("Failed to toggle image display");
    } finally {
      setTogglingImage(null);
    }
  }

  function addTempAnswer() {
    if (tempAnswer.trim()) {
      setNewQuestionAnswers([...newQuestionAnswers, tempAnswer.trim()]);
      setTempAnswer("");
    }
  }

  function removeTempAnswer(answer: string) {
    setNewQuestionAnswers(newQuestionAnswers.filter((a) => a !== answer));
  }

  async function deleteQuestion(questionId: number) {
    setDeleting(true);
    try {
      await apiFetch(
        "/admin/questions",
        {
          method: "DELETE",
          body: JSON.stringify({ question_id: questionId }),
        },
        token
      );
      await loadQuestions();
      setDeleteConfirm(null);
    } catch (e) {
      console.error("Failed to delete question:", e);
      alert("Failed to delete question");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="inline-block text-4xl"
        >
          ⏳
        </motion.div>
        <p className="text-gray-500 mt-3">Loading answers...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-gray-900">
            Answer Management
          </h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNewQuestion(true)}
            className="px-4 py-2 bg-gradient-to-r from-[#4285F4] to-[#34A853] text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition flex items-center gap-2"
          >
            <Plus size={18} />
            New Question
          </motion.button>
        </div>
        <p className="text-sm text-gray-600">
          Manage valid answers for each question. Answers are case-insensitive and
          whitespace is ignored.
        </p>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => !deleting && setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="text-red-600" size={24} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Delete Question?</h3>
              </div>

              <p className="text-gray-700 mb-6">
                Are you sure you want to delete <strong>Question {deleteConfirm}</strong>? This will also delete all associated answers and submission history.
              </p>

              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-red-800 font-medium">
                  ⚠️ This action cannot be undone!
                </p>
              </div>

              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleting}
                  className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition disabled:opacity-50"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => deleteQuestion(deleteConfirm)}
                  disabled={deleting}
                  className="flex-1 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        ⏳
                      </motion.div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={18} />
                      Delete Question
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Question Modal */}
      <AnimatePresence>
        {showNewQuestion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => {
              if (!saving) {
                setShowNewQuestion(false);
                setSelectedImage(null);
                setSelectedImageType(null);
                setNewQuestionDesk("");
                setNewQuestionAnswers([]);
                setTempAnswer("");
                setNewQuestionRound(1);
                setNewQuestionDisplay(1);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#4285F4] to-[#34A853] flex items-center justify-center">
                  <FileQuestion className="text-white" size={24} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Create New Question</h3>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Round Number
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newQuestionRound}
                      onChange={(e) => setNewQuestionRound(parseInt(e.target.value) || 1)}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#4285F4] focus:ring-4 focus:ring-[#4285F4]/20 outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Display Number
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newQuestionDisplay}
                      onChange={(e) => setNewQuestionDisplay(parseInt(e.target.value) || 1)}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#4285F4] focus:ring-4 focus:ring-[#4285F4]/20 outline-none font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Desk Location
                  </label>
                  <input
                    type="text"
                    value={newQuestionDesk}
                    onChange={(e) => setNewQuestionDesk(e.target.value)}
                    placeholder="e.g., Desk 402-B"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#4285F4] focus:ring-4 focus:ring-[#4285F4]/20 outline-none font-medium"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Question Image (Optional)
                  </label>
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[#4285F4] file:text-white hover:file:bg-[#3367D6] file:cursor-pointer"
                    />
                    {selectedImage && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative rounded-xl overflow-hidden border-2 border-gray-200"
                      >
                        <img
                          src={selectedImage}
                          alt="Preview"
                          className="w-full h-48 object-cover"
                        />
                        <button
                          onClick={() => {
                            setSelectedImage(null);
                            setSelectedImageType(null);
                          }}
                          className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                        >
                          <X size={16} />
                        </button>
                      </motion.div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Valid Answers
                  </label>

                  {newQuestionAnswers.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {newQuestionAnswers.map((answer, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-white rounded-xl px-4 py-3 border border-gray-200"
                        >
                          <span className="text-sm font-medium text-gray-800">{answer}</span>
                          <button
                            onClick={() => removeTempAnswer(answer)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                          >
                            <X size={16} />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tempAnswer}
                      onChange={(e) => setTempAnswer(e.target.value)}
                      placeholder="Enter an answer..."
                      className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#4285F4] focus:ring-4 focus:ring-[#4285F4]/20 outline-none font-medium"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          addTempAnswer();
                        }
                      }}
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={addTempAnswer}
                      disabled={!tempAnswer.trim()}
                      className="px-5 py-3 bg-[#34A853] text-white rounded-xl font-semibold disabled:opacity-50 flex items-center gap-2"
                    >
                      <Plus size={18} />
                      Add
                    </motion.button>
                  </div>
                </div>

                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-900">
                    💡 <strong>Tip:</strong> Add multiple valid answers to make the question easier. Answers are case-insensitive.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setShowNewQuestion(false);
                    setNewQuestionDesk("");
                    setNewQuestionAnswers([]);
                    setTempAnswer("");
                    setSelectedImage(null);
                    setSelectedImageType(null);
                    setNewQuestionRound(1);
                    setNewQuestionDisplay(1);
                  }}
                  disabled={saving}
                  className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition disabled:opacity-50"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={createNewQuestion}
                  disabled={saving || !newQuestionDesk.trim() || newQuestionAnswers.length === 0}
                  className="flex-1 py-3 bg-gradient-to-r from-[#4285F4] to-[#34A853] text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        ⏳
                      </motion.div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Create Question
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        {questions.map((q, idx) => (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="border-2 border-gray-200 rounded-2xl p-5 bg-gradient-to-br from-white to-gray-50 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4 gap-4">
              <div className="flex-1">
                <h3 className="font-bold text-lg text-gray-900 mb-2">
                  <span className="text-[#4285F4]">Question {q.id}</span>
                  <span className="ml-2 text-sm text-gray-600">
                    (Round {q.round_number || 1}, Display #{q.display_number || 1})
                  </span>
                </h3>

                {/* Image Preview and Toggle */}
                {q.image_url && (
                  <div className="mb-3 space-y-2">
                    <img
                      src={q.image_url}
                      alt={`Question ${q.id}`}
                      className="w-full max-w-xs h-32 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700">Image Display:</span>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleShowImage(q.id, q.show_image)}
                        disabled={togglingImage === q.id}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                          q.show_image
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                        } disabled:opacity-50`}
                      >
                        {q.show_image ? <Eye size={14} /> : <EyeOff size={14} />}
                        {q.show_image ? "ON" : "OFF"}
                      </motion.button>
                    </div>
                  </div>
                )}
                {!q.image_url && (
                  <div className="mb-3 flex items-center gap-2 text-sm text-gray-500">
                    <Image size={16} />
                    <span>No image uploaded</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-[#34A853]/10 text-[#34A853] rounded-full text-xs font-semibold whitespace-nowrap">
                  {q.answers.length} {q.answers.length === 1 ? "answer" : "answers"}
                </span>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setDeleteConfirm(q.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                  title="Delete question"
                >
                  <Trash2 size={18} />
                </motion.button>
              </div>
            </div>

            <div className="space-y-2">
              {q.answers.map((answer, i) => (
                <motion.div
                  key={answer}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.01, x: 4 }}
                  className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-white rounded-xl px-4 py-3 border border-gray-200 shadow-sm"
                >
                  <span className="text-sm font-medium text-gray-800">{answer}</span>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => removeAnswer(q.id, answer)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                    disabled={saving}
                  >
                    <X size={18} />
                  </motion.button>
                </motion.div>
              ))}

              {editingQuestion === q.id ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="flex gap-2 pt-2"
                >
                  <input
                    type="text"
                    value={newAnswers[q.id] || ""}
                    onChange={(e) =>
                      setNewAnswers({ ...newAnswers, [q.id]: e.target.value })
                    }
                    placeholder="Enter new valid answer..."
                    className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#4285F4] focus:ring-4 focus:ring-[#4285F4]/20 outline-none text-sm font-medium"
                    autoFocus
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && newAnswers[q.id]?.trim()) {
                        addAnswer(q.id, newAnswers[q.id].trim());
                      }
                    }}
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (newAnswers[q.id]?.trim()) {
                        addAnswer(q.id, newAnswers[q.id].trim());
                      }
                    }}
                    disabled={!newAnswers[q.id]?.trim() || saving}
                    className="px-5 py-3 bg-gradient-to-r from-[#34A853] to-[#4285F4] text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center gap-2 shadow-md"
                  >
                    <Save size={16} /> Add
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setEditingQuestion(null);
                      setNewAnswers({ ...newAnswers, [q.id]: "" });
                    }}
                    className="px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-xl text-sm font-medium"
                  >
                    Cancel
                  </motion.button>
                </motion.div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02, borderColor: "#4285F4" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setEditingQuestion(q.id)}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:text-[#4285F4] transition flex items-center justify-center gap-2 mt-2"
                >
                  <Plus size={18} /> Add New Answer
                </motion.button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
