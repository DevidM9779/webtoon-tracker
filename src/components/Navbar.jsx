import { Link, useLocation } from "react-router-dom";
import { Library, Activity, Search as SearchIcon, User } from "lucide-react";

export default function Navbar() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? "text-emerald-400" : "text-gray-400 hover:text-white";

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="bg-gray-900 border-b border-gray-800 p-4 sticky top-0 z-50 hidden md:block">
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

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-50 pb-safe">
        <div className="flex justify-around items-center py-3">
          <Link to="/" className={`flex flex-col items-center gap-1 ${isActive('/')}`}>
            <Library size={20} />
            <span className="text-xs">Collection</span>
          </Link>
          <Link to="/feed" className={`flex flex-col items-center gap-1 ${isActive('/feed')}`}>
            <Activity size={20} />
            <span className="text-xs">Feed</span>
          </Link>
          <Link to="/search" className={`flex flex-col items-center gap-1 ${isActive('/search')}`}>
            <SearchIcon size={20} />
            <span className="text-xs">Search</span>
          </Link>
          <Link to="/account" className={`flex flex-col items-center gap-1 ${isActive('/account')}`}>
            <User size={20} />
            <span className="text-xs">Account</span>
          </Link>
        </div>
      </nav>
    </>
  );
}