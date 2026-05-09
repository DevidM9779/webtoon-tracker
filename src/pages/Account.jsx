import { useEffect, useState } from "react";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { collection, query, onSnapshot, getDoc, doc, updateDoc, arrayUnion, arrayRemove, deleteDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { User, Mail, LogOut, Shield, Heart, Loader2 } from "lucide-react";

export default function Account({ user }) {
  const [webtoons, setWebtoons] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState([]);
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
    
    // Load user's favorite IDs
    const loadFavorites = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setFavoriteIds(userData.favoriteIds || []);
        }
      } catch (error) {
        console.error("Error loading favorites:", error);
      }
    };
    loadFavorites();
    
    return () => unsub();
  }, [user]);

  const toggleFavorite = async (webtoonId, isFavorite) => {
    try {
      const webtoon = webtoons.find(w => w.id === webtoonId);
      if (!webtoon) return;

      const globalWebtoonId = webtoon.webtoonId || webtoon.id; // Use webtoonId if available, otherwise use doc ID
      
      // Update user's favoriteIds array (limit to 5)
      const userDocRef = doc(db, "users", user.uid);
      if (isFavorite) {
        // Remove from favorites
        await updateDoc(userDocRef, {
          favoriteIds: arrayRemove(globalWebtoonId)
        });
        setFavoriteIds(prev => prev.filter(id => id !== globalWebtoonId));
        
        // Try to remove from GlobalWebtoons favoritedBy subcollection (best effort)
        try {
          const favoritedByRef = doc(db, "GlobalWebtoons", globalWebtoonId, "favoritedBy", user.uid);
          await deleteDoc(favoritedByRef);
        } catch (globalError) {
          console.warn("Could not remove from GlobalWebtoons favoritedBy:", globalError);
          // Don't fail the whole operation if this part fails
        }
      } else {
        // Add to favorites (limit to 5)
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.data();
        const currentFavorites = userData.favoriteIds || [];
        
        if (currentFavorites.length >= 5) {
          alert("You can only have up to 5 favorites");
          return;
        }
        
        await updateDoc(userDocRef, {
          favoriteIds: arrayUnion(globalWebtoonId)
        });
        setFavoriteIds(prev => [...prev, globalWebtoonId]);
        
        // Try to add to GlobalWebtoons favoritedBy subcollection (best effort)
        try {
          const favoritedByRef = doc(db, "GlobalWebtoons", globalWebtoonId, "favoritedBy", user.uid);
          await setDoc(favoritedByRef, {
            userId: user.uid,
            userName: user.displayName || "Anonymous",
            favoritedAt: new Date().toISOString()
          });
        } catch (globalError) {
          console.warn("Could not add to GlobalWebtoons favoritedBy:", globalError);
          // Don't fail the whole operation if this part fails
        }
      }
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
          Favorites (Top 5)
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
              const webtoonIdToCheck = webtoon.webtoonId || webtoon.id;
              const isFavorite = favoriteIds.includes(webtoonIdToCheck);
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