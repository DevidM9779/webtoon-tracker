import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, doc, setDoc, deleteDoc, onSnapshot, addDoc, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { Search as SearchIcon, UserPlus, Check, Loader2 } from "lucide-react";
import { useDebounce, fuzzyMatch, sortByFuzzyScore } from "../hooks/useDebounce";
import { useCache } from "../hooks/useCache";

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

export default function Search({ user }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [results, setResults] = useState([]);
  const [followingMap, setFollowingMap] = useState({}); // Keep track of who we follow
  const [pendingRequests, setPendingRequests] = useState({}); // Track pending follow requests
  const [loadingUsers, setLoadingUsers] = useState(true);
  const debouncedQuery = useDebounce(searchQuery, 300); // 300ms debounce
  
  // Cache for all users list (5 minute TTL)
  const usersCache = useCache("all_users_list", 5 * 60 * 1000);

  // Load all users once
  useEffect(() => {
    const loadAllUsers = async () => {
      try {
        // Check cache first
        const cachedUsers = usersCache.get();
        if (cachedUsers) {
          setAllUsers(cachedUsers);
          setLoadingUsers(false);
          return;
        }

        const snapshot = await getDocs(collection(db, "users"));
        const users = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(u => u.id !== user.uid); // Don't include current user
        
        setAllUsers(users);
        usersCache.set(users); // Cache the users list
        setLoadingUsers(false);
      } catch (error) {
        console.error("Error loading users:", error);
        setLoadingUsers(false);
      }
    };

    if (user) {
      loadAllUsers();
    }
  }, [user, usersCache]);

  // Load current following state from Firestore
  useEffect(() => {
    if (!user) return;
    
    const unsub = onSnapshot(
      collection(db, `users/${user.uid}/following`), 
      (snap) => {
        const map = {};
        snap.docs.forEach(doc => {
          map[doc.id] = true;
        });
        setFollowingMap(map);
      },
      (error) => {
        console.error("Error loading following state:", error);
      }
    );
    
    return () => {
      unsub();
    };
  }, [user]);

  // Load pending follow requests
  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, "followRequests"),
      where("requesterId", "==", user.uid),
      where("status", "==", "pending")
    );
    
    const unsub = onSnapshot(q, (snap) => {
      const map = {};
      snap.docs.forEach(doc => {
        map[doc.data().targetUserId] = doc.id;
      });
      setPendingRequests(map);
    });
    
    return () => {
      unsub();
    };
  }, [user]);

  // Filter users based on debounced query with fuzzy matching
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }

    const filtered = sortByFuzzyScore(allUsers, debouncedQuery);
    setResults(filtered);
  }, [debouncedQuery, allUsers]);

  const handleFollow = async (targetUser) => {
    try {
      // Check if already friends
      if (followingMap[targetUser.id]) {
        // Unfriend (remove from both sides)
        await deleteDoc(doc(db, `users/${user.uid}/following`, targetUser.id));
        await deleteDoc(doc(db, `users/${targetUser.id}/following`, user.uid));
        setFollowingMap(prev => ({ ...prev, [targetUser.id]: false }));
      } else {
        // Create friend request instead of direct follow
        const requestData = sanitizeObject({
          requesterId: user.uid,
          requesterName: user.displayName || "Anonymous",
          targetUserId: targetUser.id,
          targetName: targetUser.displayName,
          status: "pending",
          createdAt: new Date().toISOString()
        });
        await addDoc(collection(db, "followRequests"), requestData);
        setPendingRequests(prev => ({ ...prev, [targetUser.id]: true }));
      }
    } catch (error) {
      console.error("Friend/unfriend error:", error);
      alert("Failed to process friend request");
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Find Friends</h1>
      
      <div className="flex gap-2 mb-8">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
          <input 
            type="text" 
            placeholder="Search users (fuzzy matching enabled)..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
        {loadingUsers && <Loader2 className="text-emerald-400 animate-spin" size={24} />}
      </div>

      <div className="space-y-4">
        {loadingUsers ? (
          <div className="text-center py-12">
            <Loader2 className="mx-auto animate-spin text-emerald-400 mb-4" size={32} />
            <p className="text-gray-400">Loading users...</p>
          </div>
        ) : results.length === 0 && searchQuery ? (
          <div className="text-center py-12 bg-gray-900 rounded-xl border border-gray-800">
            <SearchIcon className="mx-auto text-gray-600 mb-4" size={48} />
            <p className="text-gray-400">No users found matching "{searchQuery}"</p>
            <p className="text-gray-500 text-sm mt-2">Try a different search term</p>
          </div>
        ) : results.length === 0 && !searchQuery ? (
          <div className="text-center py-12 bg-gray-900 rounded-xl border border-gray-800">
            <SearchIcon className="mx-auto text-gray-600 mb-4" size={48} />
            <p className="text-gray-400">Search for friends by name</p>
            <p className="text-gray-500 text-sm mt-2">Start typing to see matching users</p>
          </div>
        ) : (
          results.map((profile) => (
            <div key={profile.id} className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex justify-between items-center">
              <div>
                <Link to={`/profile/${profile.id}`}>
                  <h2 className="text-xl font-bold hover:text-emerald-400 transition-colors cursor-pointer">
                    {profile.displayName}
                  </h2>
                </Link>
                <div className="flex gap-4 mt-2 text-sm text-gray-400">
                  <span>📚 {profile.stats?.tracked || 0} Tracked</span>
                  <span>📖 {profile.stats?.episodesRead || 0} Episodes</span>
                  <span>🏆 {profile.stats?.finished || 0} Finished</span>
                </div>
              </div>
              
              <button 
                onClick={() => handleFollow(profile)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  followingMap[profile.id] 
                    ? "bg-gray-800 text-white" 
                    : pendingRequests[profile.id]
                      ? "bg-yellow-600/20 text-yellow-400 border border-yellow-500/30"
                      : "bg-emerald-600 text-white hover:bg-emerald-500"
                }`}
              >
                {followingMap[profile.id] ? (
                  <><Check size={18} /> Friends</>
                ) : pendingRequests[profile.id] ? (
                  <><Loader2 size={18} className="animate-spin" /> Pending</>
                ) : (
                  <><UserPlus size={18} /> Add Friend</>
                )}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}