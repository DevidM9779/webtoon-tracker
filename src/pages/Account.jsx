import { useEffect, useState } from "react";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { collection, query, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { User, Mail, LogOut, Shield, Heart, Loader2 } from "lucide-react";

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

export default function Account({ user }) {
  const [webtoons, setWebtoons] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!user) return;
    
    // Load user's webtoons
    const q = query(collection(db, `userLibraries/${user.uid}/webtoons`));
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWebtoons(items);
      setLoading(false);
    });
    
    return () => unsub();
  }, [user]);

  const toggleFavorite = async (webtoonId, isFavorite) => {
    try {
      const webtoon = webtoons.find(w => w.id === webtoonId);
      if (!webtoon) return;

      // Update the isFavorite field on the webtoon document
      const webtoonRef = doc(db, `userLibraries/${user.uid}/webtoons`, webtoonId);
      const updateData = sanitizeObject({
        isFavorite: !isFavorite
      });
      await updateDoc(webtoonRef, updateData);
    } catch (error) {
      console.error("Error updating favorites:", error);
      alert("Failed to update favorites");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Account Settings</h1>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        
        {/* Profile Header Block */}
        <div className="bg-gray-800 p-6 flex flex-col items-center border-b border-gray-700">
          <div className="w-24 h-24 bg-emerald-600 rounded-full flex items-center justify-center text-4xl font-bold text-white mb-4">
            {user.displayName ? user.displayName.charAt(0).toUpperCase() : <User size={40} />}
          </div>
          <h2 className="text-xl font-bold">{user.displayName || "Anonymous User"}</h2>
        </div>

        {/* User Details Block */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4 text-gray-300 bg-gray-800/50 p-3 rounded-lg">
            <Mail className="text-gray-500" size={20} />
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Email Address</p>
              <p>{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-gray-300 bg-gray-800/50 p-3 rounded-lg">
            <Shield className="text-gray-500" size={20} />
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">User ID</p>
              <p className="font-mono text-sm">{user.uid}</p>
            </div>
          </div>
        </div>

        {/* Logout Action */}
        <div className="p-6 bg-gray-900 border-t border-gray-800">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 py-3 rounded-lg font-bold transition-colors"
          >
            <LogOut size={18} />
            Log Out
          </button>
        </div>

      </div>

      {/* Favorites Configuration */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mt-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Heart className="text-red-500" size={20} />
          Favorites
        </h2>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-emerald-400" size={24} />
          </div>
        ) : webtoons.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Add webtoons to your collection to set favorites</p>
        ) : (
          <div className="space-y-3">
            {webtoons.map((webtoon) => {
              const isFavorite = webtoon.isFavorite || false;
              return (
                <div key={webtoon.id} className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                  <div className="flex items-center gap-3">
                    {webtoon.coverImage && (
                      <img 
                        src={webtoon.coverImage} 
                        alt={webtoon.title}
                        className="w-10 h-14 object-cover rounded"
                      />
                    )}
                    <div>
                      <p className="font-medium text-white">{webtoon.title}</p>
                      <p className="text-sm text-gray-400">{webtoon.genre}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFavorite(webtoon.id, isFavorite)}
                    className={`p-2 rounded-full transition-colors ${
                      isFavorite 
                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    <Heart 
                      size={18} 
                      className={isFavorite ? 'fill-current' : ''} 
                    />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}