import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import WebtoonCard from "../components/WebtoonCard";
import { Library, Loader2 } from "lucide-react";

export default function Home() {
  const [webtoons, setWebtoons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "webtoons"), (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setWebtoons(items);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-emerald-400" size={32} />
      </div>
    );
  }

  if (webtoons.length === 0) {
    return (
      <div className="text-center py-20">
        <Library className="mx-auto text-gray-600 mb-4" size={64} />
        <h2 className="text-xl font-semibold text-gray-400 mb-2">Your library is empty</h2>
        <p className="text-gray-500">Add your first Webtoon to get started!</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        <span className="text-emerald-400">Our</span> Webtoon Library
      </h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {webtoons.map((w) => (
          <WebtoonCard key={w.id} webtoon={w} />
        ))}
      </div>
    </div>
  );
}
