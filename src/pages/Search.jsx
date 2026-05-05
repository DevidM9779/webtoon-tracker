import { useState } from "react";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Search as SearchIcon, UserPlus, Check } from "lucide-react";

export default function Search({ user }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const [followingMap, setFollowingMap] = useState({}); // Keep track of who we follow

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Search users collection (case sensitive for simplicity, requires exact match locally)
    const q = query(collection(db, "users"), where("displayName", "==", searchQuery));
    const snapshot = await getDocs(q);
    
    const foundUsers = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(u => u.id !== user.uid); // Don't show yourself
      
    setResults(foundUsers);
  };

  const handleFollow = async (targetUser) => {
    const followRef = doc(db, `users/${user.uid}/following`, targetUser.id);
    
    if (followingMap[targetUser.id]) {
      await deleteDoc(followRef);
      setFollowingMap(prev => ({ ...prev, [targetUser.id]: false }));
    } else {
      await setDoc(followRef, { 
        userId: targetUser.id, 
        displayName: targetUser.displayName,
        followedAt: new Date().toISOString()
      });
      setFollowingMap(prev => ({ ...prev, [targetUser.id]: true }));
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Find Friends</h1>
      
      <form onSubmit={handleSearch} className="flex gap-2 mb-8">
        <input 
          type="text" 
          placeholder="Search exact display name (e.g. Adri)..." 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
        />
        <button type="submit" className="bg-emerald-600 px-4 py-2 rounded-lg text-white">
          <SearchIcon size={20} />
        </button>
      </form>

      <div className="space-y-4">
        {results.map((profile) => (
          <div key={profile.id} className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">{profile.displayName}</h2>
              <div className="flex gap-4 mt-2 text-sm text-gray-400">
                <span>📚 {profile.stats?.tracked || 0} Tracked</span>
                <span>📖 {profile.stats?.episodesRead || 0} Episodes</span>
                <span>🏆 {profile.stats?.finished || 0} Finished</span>
              </div>
            </div>
            
            <button 
              onClick={() => handleFollow(profile)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                followingMap[profile.id] ? "bg-gray-800 text-white" : "bg-emerald-600 text-white hover:bg-emerald-500"
              }`}
            >
              {followingMap[profile.id] ? <><Check size={18} /> Following</> : <><UserPlus size={18} /> Follow</>}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}