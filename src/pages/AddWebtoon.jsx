import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, getDocs, getDoc, doc, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { Search, Loader2, Save, Globe, FileText, Plus } from "lucide-react";

// Helper function to sanitize objects before saving to Firestore
const sanitizeObject = (obj) => {
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      // Provide fallbacks for common fields
      if (key === 'coverImage' || key === 'imageUrl') {
        sanitized[key] = '';
      } else if (key === 'title' || key === 'name' || key === 'displayName' || key === 'userName') {
        sanitized[key] = '';
      } else if (key === 'genre') {
        sanitized[key] = '';
      } else {
        sanitized[key] = null;
      }
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

export default function AddWebtoon({ user }) {
  const navigate = useNavigate();
  
  // UI State
  const [step, setStep] = useState("search"); // "search", "manual", "url", "confirm"
  const [searchQuery, setSearchQuery] = useState("");
  const [allGlobalWebtoons, setAllGlobalWebtoons] = useState([]);
  const [filteredWebtoons, setFilteredWebtoons] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  
  // URL Scrape State
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState("");

  // Manual Form State
  const [form, setForm] = useState({
    title: "",
    genre: "",
    coverImage: "",
    totalEpisodes: "",
    status: "Ongoing",
    rating: 0,
    myProgress: 0,
    webtoonId: "",
    sourceUrl: "",
    isManual: false, // Track if this is manually entered
  });

  // Load all GlobalWebtoons on mount
  useEffect(() => {
    const loadGlobalWebtoons = async () => {
      try {
        const snapshot = await getDocs(collection(db, "GlobalWebtoons"));
        const webtoons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllGlobalWebtoons(webtoons);
        setFilteredWebtoons(webtoons);
        setLoadingLibrary(false);
      } catch (error) {
        console.error("Error loading GlobalWebtoons:", error);
        setLoadingLibrary(false);
      }
    };
    
    loadGlobalWebtoons();
  }, []);

  // Filter webtoons based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredWebtoons(allGlobalWebtoons);
    } else {
      const filtered = allGlobalWebtoons.filter(w => 
        w.title && w.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredWebtoons(filtered);
    }
  }, [searchQuery, allGlobalWebtoons]);

  // Select webtoon from search results
  const handleSelectWebtoon = async (webtoon) => {
    try {
      // Check if webtoon already exists in user's library
      const userLibraryRef = collection(db, `userLibraries/${user.uid}/webtoons`);
      const duplicateCheck = query(userLibraryRef, where("webtoonId", "==", webtoon.id));
      const duplicateSnapshot = await getDocs(duplicateCheck);
      
      if (!duplicateSnapshot.empty) {
        alert("This webtoon already exists in your collection!");
        return;
      }

      setForm({
        ...form,
        title: webtoon.title,
        genre: webtoon.genre,
        coverImage: webtoon.coverImage,
        totalEpisodes: String(webtoon.totalEpisodes),
        webtoonId: webtoon.id,
        sourceUrl: webtoon.sourceUrl || "",
        isManual: false,
      });
      setStep("confirm");
    } catch (error) {
      console.error("Error checking for duplicates:", error);
      alert("Failed to validate webtoon. Please try again.");
    }
  };

  // URL Scrape Handler
  const handleScrape = async () => {
    if (!scrapeUrl.trim()) {
      setScrapeError("Please enter a URL");
      return;
    }
    setScraping(true);
    setScrapeError("");

    console.log("Starting to scrape URL:", scrapeUrl);

    try {
      // Get the current project ID from Firebase config or use a default
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "webtoon-tracker-demo";
      const functionUrl = `https://us-central1-${projectId}.cloudfunctions.net/scrapeWebtoon?url=${encodeURIComponent(scrapeUrl)}`;

      console.log("Calling function URL:", functionUrl);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const res = await fetch(functionUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      console.log("Scrape response status:", res.status);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}: ${res.statusText}` }));
        console.error("Scrape error response:", errorData);
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      console.log("Scrape success data:", data);

      if (data.error) {
        setScrapeError(data.error);
      } else if (!data.title) {
        setScrapeError("Could not extract webtoon data from the URL. Make sure the URL is a valid webtoon page.");
      } else {
        setForm((prev) => ({
          ...prev,
          title: data.title || prev.title,
          genre: data.genre || prev.genre,
          coverImage: data.coverImage || prev.coverImage,
          totalEpisodes: data.totalEpisodes ? String(data.totalEpisodes) : prev.totalEpisodes,
          webtoonId: data.webtoonId || prev.webtoonId,
          sourceUrl: scrapeUrl,
          isManual: false,
        }));
        setStep("confirm");
      }
    } catch (error) {
      console.error("Scraping error:", error);
      if (error.name === 'AbortError') {
        setScrapeError("Request timeout. The scraping took too long.");
      } else if (error.message.includes("Failed to fetch")) {
        setScrapeError("Failed to connect to the scraping service. The service might be down or the URL is inaccessible.");
      } else {
        setScrapeError(error.message || "Failed to scrape the URL.");
      }
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

    // Check if webtoon already exists in user's library
    try {
      const userLibraryRef = collection(db, `userLibraries/${user.uid}/webtoons`);
      let duplicateCheck;
      
      if (form.webtoonId) {
        // Check by webtoonId for scraped webtoons
        duplicateCheck = query(userLibraryRef, where("webtoonId", "==", form.webtoonId));
      } else {
        // Check by title for manual entries
        duplicateCheck = query(userLibraryRef, where("title", "==", form.title));
      }
      
      const duplicateSnapshot = await getDocs(duplicateCheck);
      
      if (!duplicateSnapshot.empty) {
        alert("This webtoon already exists in your collection!");
        return;
      }

      // Add the webtoon to user's library
      const webtoonData = sanitizeObject({
        ...form,
        userId: user.uid,
        totalEpisodes: parseInt(form.totalEpisodes, 10) || 0,
        myProgress: parseInt(form.myProgress, 10) || 0,
        rating: form.rating,
        createdAt: new Date().toISOString(),
      });
      const docRef = await addDoc(collection(db, `userLibraries/${user.uid}/webtoons`), webtoonData);

      const activityData = sanitizeObject({
        userId: user.uid,
        userName: user.displayName || "Anonymous",
        type: "ADD",
        webtoonId: docRef.id,
        webtoonTitle: form.title,
        details: "added a new Webtoon to the library.",
        createdAt: new Date().toISOString()
      });
      await addDoc(collection(db, "activities"), activityData);

      navigate("/");
    } catch (error) {
      console.error("Error adding webtoon:", error);
      if (error.message.includes("already exists")) {
        // This is our custom error message, don't show it again
        return;
      }
      alert("Failed to add webtoon. Please try again.");
    }
  };

  const inputClass = "w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors";

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 md:mb-6">Add New Webtoon</h1>

      {/* Step 1: Main Library View */}
      {step === "search" && (
        <div className="space-y-4 md:space-y-6">
          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setStep("url")}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6 hover:border-emerald-500 transition-colors text-left"
            >
              <Globe className="text-emerald-400 mb-3" size={32} />
              <h3 className="font-semibold text-white mb-1">Fetch from URL</h3>
              <p className="text-sm text-gray-400">Auto-scrape data from webtoons.com URLs</p>
            </button>
            <button
              onClick={() => setStep("manual")}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6 hover:border-emerald-500 transition-colors text-left"
            >
              <FileText className="text-emerald-400 mb-3" size={32} />
              <h3 className="font-semibold text-white mb-1">Enter Manually</h3>
              <p className="text-sm text-gray-400">Add webtoon details manually</p>
            </button>
          </div>

          {/* Search Box */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 md:p-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Search Global Library
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search by title (e.g., 'Tower of God')..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={inputClass}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">Search filters the library below</p>
          </div>

          {/* Library List */}
          <div>
            <h2 className="text-lg font-semibold mb-4">
              Global Library {filteredWebtoons.length > 0 && `(${filteredWebtoons.length} webtoons)`}
            </h2>
            
            {loadingLibrary ? (
              <div className="text-center py-12">
                <Loader2 className="mx-auto animate-spin text-emerald-400 mb-4" size={32} />
                <p className="text-gray-400">Loading library...</p>
              </div>
            ) : filteredWebtoons.length === 0 ? (
              <div className="text-center py-12 bg-gray-900 rounded-xl border border-gray-800">
                <Search className="mx-auto text-gray-600 mb-4" size={48} />
                <p className="text-gray-400">
                  {searchQuery ? `No webtoons found matching "${searchQuery}"` : "The library is currently empty"}
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  {searchQuery ? "Try a different search term" : "Add webtoons using the options above"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredWebtoons.map((webtoon) => (
                  <div
                    key={webtoon.id}
                    onClick={() => handleSelectWebtoon(webtoon)}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-emerald-500 transition-colors"
                  >
                    {webtoon.coverImage && (
                      <img src={webtoon.coverImage} alt={webtoon.title} className="w-12 h-16 md:w-16 md:h-20 object-cover rounded flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">{webtoon.title}</h3>
                      <p className="text-sm text-gray-400 truncate">{webtoon.genre}</p>
                      <p className="text-sm text-gray-500">{webtoon.totalEpisodes} episodes</p>
                    </div>
                    <Plus className="text-emerald-400 flex-shrink-0" size={24} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: URL Scrape */}
      {step === "url" && (
        <div className="space-y-4 md:space-y-6">
          <button onClick={() => setStep("search")} className="text-gray-400 hover:text-white mb-4">
            ← Back to search
          </button>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 md:p-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Fetch from URL
            </h2>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="Paste webtoon URL here (e.g., https://www.webtoons.com/...)"
                value={scrapeUrl}
                onChange={(e) => setScrapeUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleScrape()}
                className={inputClass}
              />
              <button
                onClick={handleScrape}
                disabled={scraping}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 md:px-6 rounded-lg font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {scraping ? <Loader2 className="animate-spin" size={20} /> : <span>Fetch</span>}
              </button>
            </div>
            {scrapeError && <p className="text-red-400 text-sm mt-2">{scrapeError}</p>}
            <p className="text-xs text-gray-500 mt-2">
              Paste a URL from webtoons.com or other supported webtoon sites. The system will automatically extract the title, cover image, and episode count.
            </p>
          </div>
        </div>
      )}

      {/* Step 3: Manual Entry */}
      {step === "manual" && (
        <div className="space-y-4 md:space-y-6">
          <button onClick={() => setStep("search")} className="text-gray-400 hover:text-white mb-4">
            ← Back to search
          </button>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 md:p-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
              Manual Entry
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Title *</label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Genre</label>
                <input
                  type="text"
                  name="genre"
                  value={form.genre}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Cover Image URL</label>
                <input
                  type="url"
                  name="coverImage"
                  value={form.coverImage}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Total Episodes</label>
                <input
                  type="number"
                  name="totalEpisodes"
                  value={form.totalEpisodes}
                  onChange={handleChange}
                  min="0"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="Ongoing">Ongoing</option>
                  <option value="Completed">Completed</option>
                  <option value="Hiatus">Hiatus</option>
                </select>
              </div>
              <div className="flex gap-4">
                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg font-medium transition-colors">
                  <Save size={18} className="inline mr-2" /> Add Webtoon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Step 4: Confirm & Edit */}
      {step === "confirm" && (
        <div className="space-y-4 md:space-y-6">
          <button onClick={() => setStep("search")} className="text-gray-400 hover:text-white mb-4">
            ← Start over
          </button>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 md:p-6">
            <h2 className="text-lg font-semibold mb-4">Confirm Webtoon Details</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Title *</label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Genre</label>
                <input
                  type="text"
                  name="genre"
                  value={form.genre}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Cover Image URL</label>
                <input
                  type="url"
                  name="coverImage"
                  value={form.coverImage}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Total Episodes</label>
                <input
                  type="number"
                  name="totalEpisodes"
                  value={form.totalEpisodes}
                  onChange={handleChange}
                  min="0"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="Ongoing">Ongoing</option>
                  <option value="Completed">Completed</option>
                  <option value="Hiatus">Hiatus</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">My Progress</label>
                <input
                  type="number"
                  name="myProgress"
                  value={form.myProgress}
                  onChange={handleChange}
                  min="0"
                  className={inputClass}
                />
              </div>
              <div className="flex gap-4">
                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg font-medium transition-colors">
                  <Save size={18} className="inline mr-2" /> Add Webtoon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}