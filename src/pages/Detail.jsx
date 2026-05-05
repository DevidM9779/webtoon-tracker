import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import StarRating from "../components/StarRating";
import { ArrowLeft, Loader2, Trash2, BookOpen, User } from "lucide-react";

export default function Detail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [webtoon, setWebtoon] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "webtoons", id), (snap) => {
      if (snap.exists()) {
        setWebtoon({ id: snap.id, ...snap.data() });
      } else {
        setWebtoon(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  const handleUpdate = async (field, value) => {
    // 1. Don't do anything if the value hasn't actually changed
    if (webtoon[field] === value) return;

    // 2. Update the main webtoon document
    await updateDoc(doc(db, "webtoons", id), { [field]: value });

    // 3. Generate the social feed activity
    let type = "";
    let details = "";
    let actorName = "";

    if (field === 'myProgress') {
      type = "PROGRESS";
      details = `read up to episode ${value}`;
      actorName = "Justin"; // The person doing the action
    } else if (field === 'adriProgress') {
      type = "PROGRESS";
      details = `read up to episode ${value}`;
      actorName = "Adri";
    } else if (field === 'status' && value === 'Completed') {
      type = "COMPLETE";
      details = "marked the series as completed!";
      actorName = "Justin"; // Defaulting to you for general actions until Auth is added
    } else if (field === 'rating') {
      type = "RATING";
      details = `rated the series ${value} stars`;
      actorName = "Justin";
    }

    // 4. Save to the activities collection
    if (type) {
      import("firebase/firestore").then(({ collection, addDoc }) => {
        addDoc(collection(db, "activities"), {
          userId: actorName.toLowerCase(),
          userName: actorName,
          type,
          webtoonId: id,
          webtoonTitle: webtoon.title,
          details,
          createdAt: new Date().toISOString()
        });
      });
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Delete this webtoon from the library?")) {
      await deleteDoc(doc(db, "webtoons", id));
      navigate("/");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-emerald-400" size={32} />
      </div>
    );
  }

  if (!webtoon) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Webtoon not found.</p>
        <button onClick={() => navigate("/")} className="text-emerald-400 mt-2 hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const progressPercent = (ep) =>
    webtoon.totalEpisodes > 0 ? Math.min(100, Math.round((ep / webtoon.totalEpisodes) * 100)) : 0;

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-1 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={18} /> Back to Library
      </button>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="md:flex">
          <div className="md:w-56 flex-shrink-0 bg-gray-800">
            {webtoon.coverImage ? (
              <img
                src={webtoon.coverImage}
                alt={webtoon.title}
                className="w-full h-72 md:h-full object-cover"
              />
            ) : (
              <div className="w-full h-72 md:h-full flex items-center justify-center text-gray-500">
                No Cover
              </div>
            )}
          </div>

          <div className="flex-1 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">{webtoon.title}</h1>
                <p className="text-gray-400 mt-1">{webtoon.genre}</p>
              </div>
              <button
                onClick={handleDelete}
                className="text-gray-500 hover:text-red-400 transition-colors p-2"
                title="Delete"
              >
                <Trash2 size={20} />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <button
                onClick={() =>
                  handleUpdate("status", webtoon.status === "Ongoing" ? "Completed" : "Ongoing")
                }
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  webtoon.status === "Completed"
                    ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                }`}
              >
                {webtoon.status}
              </button>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <BookOpen size={16} />
                <input
                  type="number"
                  value={webtoon.totalEpisodes || 0}
                  onChange={(e) => handleUpdate("totalEpisodes", parseInt(e.target.value, 10) || 0)}
                  className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-center focus:outline-none focus:border-emerald-500"
                  min="0"
                />
                <span>episodes</span>
              </div>
            </div>

            <div className="mt-4">
              <span className="text-sm text-gray-400 block mb-1">Rating</span>
              <StarRating
                rating={webtoon.rating || 0}
                onChange={(val) => handleUpdate("rating", val)}
              />
            </div>

            <div className="mt-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-300">Reading Progress</h2>

              <ProgressTracker
                label="My Progress"
                icon={<User size={16} />}
                current={webtoon.myProgress || 0}
                total={webtoon.totalEpisodes || 0}
                percent={progressPercent(webtoon.myProgress || 0)}
                color="emerald"
                onChange={(val) => handleUpdate("myProgress", val)}
              />

              <ProgressTracker
                label="Adri's Progress"
                icon={<User size={16} />}
                current={webtoon.adriProgress || 0}
                total={webtoon.totalEpisodes || 0}
                percent={progressPercent(webtoon.adriProgress || 0)}
                color="violet"
                onChange={(val) => handleUpdate("adriProgress", val)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressTracker({ label, icon, current, total, percent, color, onChange }) {
  const barColor = color === "emerald" ? "bg-emerald-500" : "bg-violet-500";
  const textColor = color === "emerald" ? "text-emerald-400" : "text-violet-400";

  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={`flex items-center gap-2 text-sm font-medium ${textColor}`}>
          {icon}
          {label}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-white font-medium">Ep</span>
          <input
            type="number"
            value={current}
            onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
            className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-center text-sm focus:outline-none focus:border-emerald-500"
            min="0"
          />
          <span className="text-gray-500">/ {total}</span>
        </div>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2.5">
        <div
          className={`${barColor} h-2.5 rounded-full transition-all duration-300`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1 text-right">{percent}%</p>
    </div>
  );
}
