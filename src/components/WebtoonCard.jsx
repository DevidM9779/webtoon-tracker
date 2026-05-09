import { Link } from "react-router-dom";

export default function WebtoonCard({ webtoon, showProgress = false, progress = 0, total = 0, userId }) {
  const progressPercent = total > 0 ? Math.min(100, Math.round((progress / total) * 100)) : 0;

  return (
    <Link
      to={`/webtoon/${userId}/${webtoon.id}`}
      className="group bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-emerald-500/50 transition-all hover:shadow-lg hover:shadow-emerald-500/10"
    >
      <div className="aspect-[3/4] overflow-hidden bg-gray-800 relative">
        {webtoon.coverImage ? (
          <img
            src={webtoon.coverImage}
            alt={webtoon.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
          />
        ) : null}
        <div
          className={`w-full h-full items-center justify-center text-gray-500 text-sm ${webtoon.coverImage ? "hidden" : "flex"}`}
        >
          No Cover
        </div>
        
        {/* Progress Bar Overlay */}
        {showProgress && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-white text-xs mt-1 font-medium">{progressPercent}%</p>
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm truncate group-hover:text-emerald-400 transition-colors">
          {webtoon.title}
        </h3>
        <p className="text-xs text-gray-400 mt-1 truncate">{webtoon.genre}</p>
      </div>
    </Link>
  );
}
