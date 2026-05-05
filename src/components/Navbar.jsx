import { Link, useLocation } from "react-router-dom";
import { Library, Activity, Search as SearchIcon, User } from "lucide-react";

export default function Navbar() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? "text-emerald-400" : "text-gray-400 hover:text-white";

  return (
    <nav className="bg-gray-900 border-b border-gray-800 p-4 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-bold text-white flex items-center gap-2">
          <Library className="text-emerald-400" /> Webtoon Tracker
        </Link>
        <div className="flex gap-6 font-medium">
          <Link to="/" className={`flex items-center gap-1 ${isActive('/')}`}><Library size={18}/> Collection</Link>
          <Link to="/feed" className={`flex items-center gap-1 ${isActive('/feed')}`}><Activity size={18}/> Feed</Link>
          <Link to="/search" className={`flex items-center gap-1 ${isActive('/search')}`}><SearchIcon size={18}/> Search</Link>
          <Link to="/account" className={`flex items-center gap-1 ${isActive('/account')}`}><User size={18}/> Account</Link>
        </div>
      </div>
    </nav>
  );
}