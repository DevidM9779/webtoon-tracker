import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import Navbar from "./components/Navbar";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Feed from "./pages/Feed";
import Search from "./pages/Search";
import Account from "./pages/Account";
import Detail from "./pages/Detail";
import AddWebtoon from "./pages/AddWebtoon";
import UserProfile from "./pages/UserProfile";
import { Loader2 } from "lucide-react";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><Loader2 className="animate-spin text-emerald-400" size={48} /></div>;
  }

  if (!user) return <Auth />;

  return (
    <Router>
      <div className="min-h-screen bg-gray-950 text-white pb-20 md:pb-0">
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home user={user} />} />
            <Route path="/feed" element={<Feed user={user} />} />
            <Route path="/search" element={<Search user={user} />} />
            <Route path="/account" element={<Account user={user} />} />
            <Route path="/add" element={<AddWebtoon user={user} />} />
            <Route path="/webtoon/:id" element={<Detail user={user} />} />
            <Route path="/profile/:userId" element={<UserProfile currentUser={user} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}