import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Search, Loader2, Save } from "lucide-react";

export default function AddWebtoon() {
  const navigate = useNavigate();
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState("");

  const [form, setForm] = useState({
    title: "",
    genre: "",
    coverImage: "",
    totalEpisodes: "",
    status: "Ongoing",
    rating: 0,
    myProgress: 0,
    adriProgress: 0,
  });

  const handleScrape = async () => {
    if (!scrapeUrl.trim()) return;
    setScraping(true);
    setScrapeError("");

    try {
      const res = await fetch(
        `http://127.0.0.1:5001/demo-webtoon-app/us-central1/scrapeWebtoon?url=${encodeURIComponent(scrapeUrl)}`
      );
      const data = await res.json();

      if (data.error) {
        setScrapeError(data.error);
      } else {
        setForm((prev) => ({
          ...prev,
          title: data.title || prev.title,
          genre: data.genre || prev.genre,
          coverImage: data.coverImage || prev.coverImage,
          totalEpisodes: data.totalEpisodes ? String(data.totalEpisodes) : prev.totalEpisodes,
        }));
      }
    } catch {
      setScrapeError("Failed to connect to scraper. Make sure Firebase emulators are running.");
    } finally {
      setScraping(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    // 1. Add the webtoon
    const docRef = await addDoc(collection(db, "webtoons"), {
      ...form,
      totalEpisodes: parseInt(form.totalEpisodes, 10) || 0,
      myProgress: parseInt(form.myProgress, 10) || 0,
      adriProgress: parseInt(form.adriProgress, 10) || 0,
      rating: form.rating,
      createdAt: new Date().toISOString(),
    });

    // 2. Create the social feed post
    await addDoc(collection(db, "activities"), {
      userId: "justin", // Mock user ID
      userName: "Justin", // Mock user name
      type: "ADD",
      webtoonId: docRef.id,
      webtoonTitle: form.title,
      details: "added a new Webtoon to the library.",
      createdAt: new Date().toISOString()
    });

    navigate("/");
  };

  const inputClass =
    "w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors";

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Add New Webtoon</h1>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Auto-fill from URL
        </h2>
        <div className="flex gap-2">
          <input
            type="url"
            value={scrapeUrl}
            onChange={(e) => setScrapeUrl(e.target.value)}
            placeholder="Paste a Webtoon URL..."
            className={inputClass}
          />
          <button
            type="button"
            onClick={handleScrape}
            disabled={scraping}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors whitespace-nowrap"
          >
            {scraping ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            Fetch Data
          </button>
        </div>
        {scrapeError && (
          <p className="mt-2 text-sm text-red-400">{scrapeError}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Title *</label>
          <input name="title" value={form.title} onChange={handleChange} className={inputClass} required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Genre</label>
          <input name="genre" value={form.genre} onChange={handleChange} className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Cover Image URL</label>
          <input name="coverImage" value={form.coverImage} onChange={handleChange} className={inputClass} />
          {form.coverImage && (
            <img
              src={form.coverImage}
              alt="Preview"
              className="mt-2 w-32 h-44 object-cover rounded-lg border border-gray-700"
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Total Episodes</label>
            <input
              name="totalEpisodes"
              type="number"
              min="0"
              value={form.totalEpisodes}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
            <select name="status" value={form.status} onChange={handleChange} className={inputClass}>
              <option value="Ongoing">Ongoing</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">My Progress (Episode)</label>
            <input
              name="myProgress"
              type="number"
              min="0"
              value={form.myProgress}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">{"Adri's Progress (Episode)"}</label>
            <input
              name="adriProgress"
              type="number"
              min="0"
              value={form.adriProgress}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors mt-2"
        >
          <Save size={18} />
          Save to Library
        </button>
      </form>
    </div>
  );
}
