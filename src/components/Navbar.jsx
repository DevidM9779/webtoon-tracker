import { Link } from "react-router-dom";
import { BookOpen, PlusCircle } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-emerald-400 hover:text-emerald-300 transition-colors">
          <BookOpen size={24} />
          <span>WebtoonTracker</span>
        </Link>
        <Link
          to="/add"
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <PlusCircle size={18} />
          <span>Add Webtoon</span>
        </Link>
      </div>
    </nav>
  );
}
