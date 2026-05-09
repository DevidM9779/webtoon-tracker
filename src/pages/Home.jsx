import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import WebtoonCard from "../components/WebtoonCard";
import { Library, Loader2, Plus } from "lucide-react";

export default function Home({ user }) {
  const navigate = useNavigate();
  const [webtoons, setWebtoons] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (!user) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
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
              userId={user.uid}
            />
          ))}
        </div>
      )}
    </div>
  );
}