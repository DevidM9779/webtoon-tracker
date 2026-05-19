import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import WebtoonCard from "../components/WebtoonCard";
import { Library, Loader2, Plus, Search, Filter, X } from "lucide-react";

export default function Home({ user }) {
  const navigate = useNavigate();
  const [webtoons, setWebtoons] = useState([]);
  const [filteredWebtoons, setFilteredWebtoons] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Extract unique genres from webtoons
  const genres = [...new Set(webtoons.map(w => w.genre).filter(Boolean))].sort();

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

  // Filter webtoons based on search and filters
  useEffect(() => {
    let filtered = webtoons;

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(w => 
        w.title && w.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Genre filter
    if (genreFilter !== "all") {
      filtered = filtered.filter(w => w.genre === genreFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(w => w.status === statusFilter);
    }

    setFilteredWebtoons(filtered);
  }, [searchQuery, genreFilter, statusFilter, webtoons]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setGenreFilter("all");
    setStatusFilter("all");
  };

  // Check if any filters are active
  const hasActiveFilters = searchQuery || genreFilter !== "all" || statusFilter !== "all";

  if (!user) return null;

  return (
    <div>
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">
          <span className="text-emerald-400">My</span> Collection
        </h1>
        <button 
          onClick={() => navigate("/add")}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          <span className="text-emerald-400">My</span> Collection
        </h1>
        <button 
          onClick={() => navigate("/add")}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus size={18} />
          Add Webtoon
        </button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        {/* Desktop: Search and Filters in one row */}
        <div className="hidden md:flex gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
            <input
              type="text"
              placeholder="Search by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Genre Filter */}
          <select
            value={genreFilter}
            onChange={(e) => setGenreFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 min-w-[140px]"
          >
            <option value="all">All Genres</option>
            {genres.map(genre => (
              <option key={genre} value={genre}>{genre}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 min-w-[140px]"
          >
            <option value="all">All Status</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Completed">Completed</option>
            <option value="Hiatus">Hiatus</option>
          </select>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
            >
              <X size={18} />
              Clear
            </button>
          )}
        </div>

        {/* Mobile: Stacked layout */}
        <div className="md:hidden space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
            <input
              type="text"
              placeholder="Search by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Mobile Filter Toggle - Full Width */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white flex-1"
            >
              <span className="flex items-center gap-2">
                <Filter size={18} />
                Filters
              </span>
              {hasActiveFilters && (
                <span className="bg-emerald-600 text-xs px-2 py-1 rounded-full">
                  {[genreFilter !== "all", statusFilter !== "all", searchQuery].filter(Boolean).length}
                </span>
              )}
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Mobile Filters - Full Width */}
          {showFilters && (
            <div className="flex flex-col gap-3">
              {/* Genre Filter */}
              <select
                value={genreFilter}
                onChange={(e) => setGenreFilter(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Genres</option>
                {genres.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Status</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
                <option value="Hiatus">Hiatus</option>
              </select>

              {/* Active Filters Display */}
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2">
                  {searchQuery && (
                    <span className="bg-gray-700 text-white text-sm px-3 py-1 rounded-full flex items-center gap-1">
                      Search: "{searchQuery}"
                      <button onClick={() => setSearchQuery("")} className="hover:text-red-400">×</button>
                    </span>
                  )}
                  {genreFilter !== "all" && (
                    <span className="bg-gray-700 text-white text-sm px-3 py-1 rounded-full flex items-center gap-1">
                      {genreFilter}
                      <button onClick={() => setGenreFilter("all")} className="hover:text-red-400">×</button>
                    </span>
                  )}
                  {statusFilter !== "all" && (
                    <span className="bg-gray-700 text-white text-sm px-3 py-1 rounded-full flex items-center gap-1">
                      {statusFilter}
                      <button onClick={() => setStatusFilter("all")} className="hover:text-red-400">×</button>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results Count */}
      {!loading && filteredWebtoons.length > 0 && (
        <p className="text-sm text-gray-400 mb-4">
          Showing {filteredWebtoons.length} of {webtoons.length} webtoons
          {hasActiveFilters && " (filtered)"}
        </p>
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
      ) : filteredWebtoons.length === 0 ? (
        <div className="text-center py-20 bg-gray-900 rounded-xl border border-gray-800">
          <Search className="mx-auto text-gray-600 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-gray-400 mb-2">No webtoons found</h2>
          <p className="text-gray-500">Try adjusting your filters or search terms</p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 text-emerald-400 hover:text-emerald-300"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredWebtoons.map((w) => (
            <WebtoonCard 
              key={w.id} 
              webtoon={w} 
              showProgress={true}
              progress={w.myProgress || 0}
              total={w.totalEpisodes || 0}
              userId={user.uid}
            />
          ))}
        </div>
      )}
    </div>
  );
}