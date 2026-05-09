import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import WebtoonCard from "../components/WebtoonCard";
import { Loader2, Heart, BookOpen, Filter, Search } from "lucide-react";
import { useCache, clearCachePattern } from "../hooks/useCache";

export default function UserProfile({ currentUser }) {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [webtoons, setWebtoons] = useState([]);
  const [favoriteWebtoons, setFavoriteWebtoons] = useState([]);
  const [filteredWebtoons, setFilteredWebtoons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  
  // Cache hook for user profile
  const profileCache = useCache(`user_profile_${userId}`);

  useEffect(() => {
    if (!userId) return;

    // Load user profile
    const loadProfile = async () => {
      try {
        // Check cache first
        const cachedProfile = profileCache.get();
        if (cachedProfile) {
          setProfile(cachedProfile);
        }

        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          const profileData = { id: userDoc.id, ...userDoc.data() };
          setProfile(profileData);
          profileCache.set(profileData); // Cache the profile
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      }
    };

    loadProfile();

    // Load user's webtoons from their library
    const webtoonsRef = collection(db, `userLibraries/${userId}/webtoons`);
    const q = query(webtoonsRef, orderBy("createdAt", "desc"));
    
    const unsub = onSnapshot(q, (snapshot) => {
      try {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setWebtoons(items);
        setLoading(false);
      } catch (error) {
        console.error("Error processing webtoons:", error);
        setWebtoons([]);
        setLoading(false);
      }
    }, (error) => {
      console.error("Error loading webtoons:", error);
      setWebtoons([]);
      setLoading(false);
    });

    return () => unsub();
  }, [userId]);

  // Filter webtoons based on search and status
  useEffect(() => {
    let filtered = webtoons;

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(w => 
        w && w.title && w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w && w.genre && w.genre.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter(w => w && w.status === filterStatus);
    }

    setFilteredWebtoons(filtered);
  }, [searchQuery, filterStatus, webtoons]);

  // Filter favorite webtoons from the user's library
  useEffect(() => {
    const favorites = webtoons.filter(w => w && w.isFavorite === true);
    setFavoriteWebtoons(favorites);
  }, [webtoons]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-emerald-400" size={32} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">User not found.</p>
      </div>
    );
  }

  // No longer using favoriteIds - favorites are now based on isFavorite field

  return (
    <div className="max-w-6xl mx-auto">
      {/* Profile Header */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 mb-8">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-emerald-600 rounded-full flex items-center justify-center text-4xl font-bold text-white">
            {profile.displayName && profile.displayName.charAt(0) ? profile.displayName.charAt(0).toUpperCase() : "?"}
          </div>
          <div>
            <h1 className="text-3xl font-bold">{profile.displayName || 'Anonymous User'}</h1>
            <div className="flex gap-6 mt-2 text-gray-400">
              <span className="flex items-center gap-2">
                <BookOpen size={18} /> {webtoons.length} Tracked
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Favorites Grid */}
      {favoriteWebtoons.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Heart className="text-red-500" size={20} /> Favorites
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {favoriteWebtoons.map((fav) => (
              <div key={fav.id} className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
                <div className="aspect-[3/4] overflow-hidden bg-gray-800 relative">
                  {fav.coverImage ? (
                    <img
                      src={fav.coverImage}
                      alt={fav.title || 'Unknown'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                      No Cover
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm truncate text-white">{fav.title || 'Unknown'}</h3>
                  <p className="text-xs text-gray-400 mt-1 truncate">{fav.genre || 'Unknown'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Webtoon Grid with Filters */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Library</h2>
          <div className="flex gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Status</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        {filteredWebtoons.length === 0 ? (
          <div className="text-center py-12 bg-gray-900 rounded-xl border border-gray-800">
            <BookOpen className="mx-auto text-gray-600 mb-4" size={48} />
            <p className="text-gray-400">No webtoons found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredWebtoons.map((webtoon) => (
              webtoon && (
                <WebtoonCard
                  key={webtoon.id}
                  webtoon={webtoon}
                  showProgress={true}
                  progress={webtoon.myProgress || 0}
                  total={webtoon.totalEpisodes || 0}
                  userId={userId}
                />
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}