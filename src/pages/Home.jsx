import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import WebtoonCard from "../components/WebtoonCard";
import { Library, Loader2, Search, Save, Plus, X } from "lucide-react";

export default function Home({ user }) {
  const [webtoons, setWebtoons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State
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
    webtoonId: "",
    sourceUrl: "",
  });

  // Fetch only the logged-in user's webtoons
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `userLibraries/${user.uid}/webtoons`));
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setWebtoons(items);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  // Scraper Handler
  const handleScrape = async () => {
    if (!scrapeUrl.trim()) return;
    setScraping(true);
    setScrapeError("");

    try {
      console.log("Starting scrape for:", scrapeUrl);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for production

      const res = await fetch(
        `https://us-central1-webtoon-tracker-demo.cloudfunctions.net/scrapeWebtoon?url=${encodeURIComponent(scrapeUrl)}`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      console.log("Response received:", res.status);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}: ${res.statusText}` }));
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log("Data received:", data);

      if (data.error) {
        setScrapeError(data.error);
      } else {
        setForm((prev) => ({
          ...prev,
          title: data.title || prev.title,
          genre: data.genre || prev.genre,
          coverImage: data.coverImage || prev.coverImage,
          totalEpisodes: data.totalEpisodes ? String(data.totalEpisodes) : prev.totalEpisodes,
          webtoonId: data.webtoonId || prev.webtoonId, // Store the global webtoon ID
          sourceUrl: scrapeUrl, // Store the source URL
        }));
      }
    } catch (error) {
      console.error("Scraping error:", error);
      if (error.name === 'AbortError') {
        setScrapeError("Request timeout. The scraping took too long. The website might be slow or blocking requests.");
      } else if (error.message.includes("Failed to fetch")) {
        setScrapeError("Failed to connect to the scraping service. Please check your internet connection.");
      } else {
        setScrapeError(error.message || "Failed to scrape the URL. Please try again.");
      }
    } finally {
      setScraping(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!form.title.trim()) {
      alert("Title is required");
      return;
    }
    if (form.totalEpisodes && parseInt(form.totalEpisodes, 10) < 0) {
      alert("Total episodes cannot be negative");
      return;
    }
    if (form.myProgress && parseInt(form.myProgress, 10) < 0) {
      alert("My progress cannot be negative");
      return;
    }
    if (form.adriProgress && parseInt(form.adriProgress, 10) < 0) {
      alert("Adri's progress cannot be negative");
      return;
    }

    try {
      // 1. Add Webtoon to user's library
      const docRef = await addDoc(collection(db, `userLibraries/${user.uid}/webtoons`), {
        ...form,
        userId: user.uid, // Tie this to the specific user!
        totalEpisodes: parseInt(form.totalEpisodes, 10) || 0,
        myProgress: parseInt(form.myProgress, 10) || 0,
        adriProgress: parseInt(form.adriProgress, 10) || 0,
        rating: form.rating,
        webtoonId: form.webtoonId || null, // Store global webtoon ID
        sourceUrl: form.sourceUrl || "", // Store source URL
        createdAt: new Date().toISOString(),
      });

    // 2. Create the social feed post so followers see it (only for major milestones)
      await addDoc(collection(db, "activities"), {
        userId: user.uid,
        userName: user.displayName,
        type: "ADD",
        webtoonId: docRef.id,
        webtoonTitle: form.title,
        details: "added a new Webtoon to the library.",
        createdAt: new Date().toISOString()
      });

      // Reset form and close
      setForm({ title: "", genre: "", coverImage: "", totalEpisodes: "", status: "Ongoing", rating: 0, myProgress: 0, adriProgress: 0, webtoonId: "", sourceUrl: "" });
      setScrapeUrl("");
      setShowAddForm(false);
    } catch (error) {
      console.error("Error adding webtoon:", error);
      alert("Failed to add webtoon. Please try again.");
    }
  };

  const inputClass = "w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          <span className="text-emerald-400">My</span> Collection
        </h1>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          {showAddForm ? <X size={18} /> : <Plus size={18} />}
          {showAddForm ? "Cancel" : "Add Webtoon"}
        </button>
      </div>

      {/* ADD WEBTOON FORM BLOCK */}
      {showAddForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Auto-fill from URL</h2>
            <div className="flex gap-2">
              <input type="url" value={scrapeUrl} onChange={(e) => setScrapeUrl(e.target.value)} placeholder="Paste a Webtoon URL..." className={inputClass} />
              <button type="button" onClick={handleScrape} disabled={scraping} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap">
                {scraping ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />} Fetch
              </button>
            </div>
            {scrapeError && <p className="mt-2 text-sm text-red-400">{scrapeError}</p>}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Title *</label>
                <input name="title" value={form.title} onChange={handleChange} className={inputClass} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Genre</label>
                <input name="genre" value={form.genre} onChange={handleChange} className={inputClass} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Cover Image URL</label>
              <input name="coverImage" value={form.coverImage} onChange={handleChange} className={inputClass} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Total Episodes</label>
                <input name="totalEpisodes" type="number" min="0" value={form.totalEpisodes} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                <select name="status" value={form.status} onChange={handleChange} className={inputClass}>
                  <option value="Ongoing">Ongoing</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            <button type="submit" className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors mt-4">
              <Save size={18} /> Save to Collection
            </button>
          </form>
        </div>
      )}

      {/* WEBTOON GRID */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-emerald-400" size={32} /></div>
      ) : webtoons.length === 0 ? (
        <div className="text-center py-20 bg-gray-900 rounded-xl border border-gray-800">
          <Library className="mx-auto text-gray-600 mb-4" size={64} />
          <h2 className="text-xl font-semibold text-gray-400 mb-2">Your collection is empty</h2>
          <p className="text-gray-500">Click Add Webtoon above to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {webtoons.map((w) => (
            <WebtoonCard 
              key={w.id} 
              webtoon={w} 
              showProgress={true}
              progress={w.myProgress || 0}
              total={w.totalEpisodes || 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}