import { Star } from "lucide-react";

export default function StarRating({ rating, onChange, readonly = false }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange && onChange(star)}
          className={`transition-colors ${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"}`}
        >
          <Star
            size={22}
            className={star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-600"}
          />
        </button>
      ))}
    </div>
  );
}
