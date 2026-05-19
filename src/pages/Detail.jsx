import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, onSnapshot, updateDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import StarRating from "../components/StarRating";
import { ArrowLeft, Loader2, Trash2, BookOpen, User, RefreshCw, Link as LinkIcon, Users, Heart } from "lucide-react";

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


export default function Detail({ user }) {
  const { userId, webtoonId } = useParams();
  const navigate = useNavigate();
  const [webtoon, setWebtoon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");
  const [editingUrl, setEditingUrl] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [friendsProgress, setFriendsProgress] = useState([]);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  
  // Check if the current user is the owner of this webtoon
  const isOwner = user && userId === user.uid;

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, `userLibraries/${userId}/webtoons`, webtoonId), (snap) => {
      if (snap.exists()) {
        setWebtoon({ id: snap.id, ...snap.data() });
        setSourceUrl(snap.data().sourceUrl || "");
      } else {
        setWebtoon(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [userId, webtoonId, user]);

  // Fetch owner's profile data
  useEffect(() => {
    if (!userId) return;
    
    const fetchProfile = async () => {
      setProfileLoading(true);
      try {
        console.log("Fetching profile for userId:", userId);
        const profileDoc = await getDoc(doc(db, "users", userId));
        if (profileDoc.exists()) {
          const profileData = { id: profileDoc.id, ...profileDoc.data() };
          console.log("Profile data fetched:", profileData);
          setProfile(profileData);
        } else {
          console.log("Profile not found for userId:", userId);
          setProfile(null);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        setProfile(null);
      } finally {
        setProfileLoading(false);
      }
    };
    
    fetchProfile();
  }, [userId]);

  // Fetch friends who are also tracking this webtoon
  useEffect(() => {
    if (!user || !webtoon) return;

    const fetchFriendsProgress = async () => {
      try {
        // Get the global webtoon ID to match across users
        const globalWebtoonId = webtoon.webtoonId;
        if (!globalWebtoonId) {
          setFriendsProgress([]);
          return;
        }

        // If viewing own webtoon, show all friends' progress
        // If viewing friend's webtoon, show only current user's progress
        if (isOwner) {
          // Get the list of users the current user is following
          const followingQuery = query(collection(db, `users/${user.uid}/following`));
          const followingSnapshot = await getDocs(followingQuery);
          const friendIds = followingSnapshot.docs.map(doc => doc.id);

          if (friendIds.length === 0) {
            setFriendsProgress([]);
            return;
          }

          // Check which friends have this webtoon in their library (by global webtoon ID)
          const friendsWithWebtoon = [];
          
          for (const friendId of friendIds) {
            try {
              // Query the friend's library for webtoons with matching global webtoon ID
              const friendLibraryQuery = query(
                collection(db, `userLibraries/${friendId}/webtoons`),
                where("webtoonId", "==", globalWebtoonId)
              );
              const friendLibrarySnapshot = await getDocs(friendLibraryQuery);
              
              if (!friendLibrarySnapshot.empty) {
                const friendWebtoon = friendLibrarySnapshot.docs[0].data();
                const friendData = followingSnapshot.docs.find(doc => doc.id === friendId)?.data();
                friendsWithWebtoon.push({
                  userId: friendId,
                  displayName: friendData?.displayName || "Anonymous",
                  myProgress: friendWebtoon.myProgress || 0,
                });
              }
            } catch (error) {
              console.error(`Error checking friend ${friendId}:`, error);
            }
          }

          setFriendsProgress(friendsWithWebtoon);
        } else {
          // Viewing friend's webtoon - show only current user's progress if they have it
          try {
            const userLibraryQuery = query(
              collection(db, `userLibraries/${user.uid}/webtoons`),
              where("webtoonId", "==", globalWebtoonId)
            );
            const userLibrarySnapshot = await getDocs(userLibraryQuery);
            
            if (!userLibrarySnapshot.empty) {
              const userWebtoon = userLibrarySnapshot.docs[0].data();
              setFriendsProgress([{
                userId: user.uid,
                displayName: "My Progress",
                myProgress: userWebtoon.myProgress || 0,
              }]);
            } else {
              setFriendsProgress([]);
            }
          } catch (error) {
            console.error("Error checking user's own progress:", error);
            setFriendsProgress([]);
          }
        }
      } catch (error) {
        console.error("Error fetching friends progress:", error);
      }
    };

    fetchFriendsProgress();
  }, [user, webtoon, webtoonId, isOwner]);

  const handleUpdate = async (field, value) => {
    // Only allow updates if the user is the owner
    if (!isOwner) {
      alert("You can only edit your own webtoons");
      return;
    }
    
    // 1. Don't do anything if the value hasn't actually changed
    if (webtoon[field] === value) return;

    // 2. Update the main webtoon document in user's library
    await updateDoc(doc(db, `userLibraries/${userId}/webtoons`, webtoonId), { [field]: value });

    // 3. Generate the social feed activity (only for major milestones)
    let type = "";
    let details = "";
    let actorName = user.displayName || "Anonymous";

    if (field === 'status' && value === 'Completed') {
      type = "COMPLETE";
      details = "marked the series as completed!";
    }
    // Removed progress and rating activities - only major milestones now

    // 4. Save to the activities collection
    if (type) {
      import("firebase/firestore").then(({ collection, addDoc }) => {
        addDoc(collection(db, "activities"), {
          userId: user.uid,
          userName: actorName,
          type,
          webtoonId: webtoonId,
          webtoonTitle: webtoon.title,
          details,
          createdAt: new Date().toISOString()
        });
      });
    }
  };

  const handleDelete = async () => {
    if (!isOwner) {
      alert("You can only delete your own webtoons");
      return;
    }
    
    if (window.confirm("Delete this webtoon from the library?")) {
      await deleteDoc(doc(db, `userLibraries/${userId}/webtoons`, webtoonId));
      navigate("/");
    }
  };

  const handleRefreshMetadata = async () => {
    if (!isOwner) {
      alert("You can only refresh metadata for your own webtoons");
      return;
    }
    
    if (!webtoon.webtoonId && !webtoon.sourceUrl) {
      alert("Cannot refresh metadata - no webtoon ID or source URL found. Please try scraping again.");
      return;
    }

    setRefreshing(true);
    try {
      // Get the current project ID from Firebase config or use a default
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "webtoon-tracker-demo";
      
      let res;
      if (webtoon.webtoonId) {
        res = await fetch(
          `https://us-central1-${projectId}.cloudfunctions.net/refreshWebtoonMetadata?webtoonId=${webtoon.webtoonId}`
        );
      } else if (webtoon.sourceUrl) {
        // Fallback to scraping if we have a source URL but no webtoonId
        res = await fetch(
          `https://us-central1-${projectId}.cloudfunctions.net/scrapeWebtoon?url=${encodeURIComponent(webtoon.sourceUrl)}`
        );
      }
      
      const data = await res.json();

      if (data.error) {
        alert(data.error);
      } else {
        // Update the webtoon document with refreshed metadata
        const metadata = sanitizeObject({
          title: data.title,
          genre: data.genre,
          coverImage: data.coverImage,
          totalEpisodes: data.totalEpisodes,
          sourceUrl: data.sourceUrl || webtoon.sourceUrl,
          webtoonId: data.webtoonId || webtoon.webtoonId, // Update webtoonId if provided
        });
        await updateDoc(doc(db, `userLibraries/${userId}/webtoons`, webtoonId), metadata);
        alert("Metadata refreshed successfully!");
      }
    } catch (error) {
      console.error("Refresh error:", error);
      alert("Failed to refresh metadata. Please try again.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveSourceUrl = async () => {
    if (!isOwner) {
      alert("You can only edit source URL for your own webtoons");
      return;
    }
    
    try {
      await updateDoc(doc(db, `userLibraries/${userId}/webtoons`, webtoonId), { sourceUrl });
      setEditingUrl(false);
    } catch (error) {
      console.error("Error saving source URL:", error);
      alert("Failed to save source URL.");
    }
  };

  const handleToggleFavorite = async () => {
    if (!user) return;
    
    try {
      // Only the owner can favorite their own webtoons
      if (!isOwner) {
        alert("You can only favorite your own webtoons");
        return;
      }
      
      const updateData = sanitizeObject({
        isFavorite: !webtoon.isFavorite
      });
      await updateDoc(doc(db, `userLibraries/${user.uid}/webtoons`, webtoonId), updateData);
    } catch (error) {
      console.error("Error toggling favorite:", error);
      alert("Failed to update favorite status");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-emerald-400" size={32} />
      </div>
    );
  }

  if (!webtoon) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Webtoon not found.</p>
        <button onClick={() => navigate("/")} className="text-emerald-400 mt-2 hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const progressPercent = (ep) =>
    webtoon.totalEpisodes > 0 ? Math.min(100, Math.round((ep / webtoon.totalEpisodes) * 100)) : 0;

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-1 text-gray-400 hover:text-white mb-4 md:mb-6 transition-colors"
      >
        <ArrowLeft size={18} /> Back to Library
      </button>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="md:flex">
          <div className="md:w-56 flex-shrink-0 bg-gray-800">
            {webtoon.coverImage && !imageError ? (
              <img
                src={webtoon.coverImage}
                alt={webtoon.title}
                className="w-full h-64 md:h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-64 md:h-full flex items-center justify-center text-gray-500">
                No Cover
              </div>
            )}
          </div>

          <div className="flex-1 p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl md:text-2xl font-bold">{webtoon.title}</h1>
                  {webtoon.isManual && (
                    <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full">
                      Manual Entry
                    </span>
                  )}
                </div>
                <p className="text-gray-400 mt-1 text-sm md:text-base">{webtoon.genre}</p>
              </div>
              <div className="flex gap-2">
                {/* Heart toggle for favorites - only works for owner */}
                <button
                  onClick={handleToggleFavorite}
                  className={`transition-colors p-2 ${
                    webtoon.isFavorite 
                      ? 'text-red-400 hover:text-red-300' 
                      : 'text-gray-500 hover:text-red-400'
                  }`}
                  title={webtoon.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                >
                  <Heart 
                    size={20} 
                    className={webtoon.isFavorite ? 'fill-current' : ''} 
                  />
                </button>
                
                {/* Only show edit buttons if user is the owner */}
                {isOwner && (
                  <>
                    {/* Only show refresh button if webtoon was not manually entered */}
                    {!webtoon.isManual && (
                      <button
                        onClick={handleRefreshMetadata}
                        disabled={refreshing}
                        className="text-gray-500 hover:text-emerald-400 transition-colors p-2"
                        title="Refresh Metadata"
                      >
                        {refreshing ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
                      </button>
                    )}
                    <button
                      onClick={handleDelete}
                      className="text-gray-500 hover:text-red-400 transition-colors p-2"
                      title="Delete"
                    >
                      <Trash2 size={20} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Source URL Section */}
            <div className="mt-4 bg-gray-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                <LinkIcon size={16} />
                <span>Source URL</span>
              </div>
              {editingUrl ? (
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                    placeholder="https://..."
                  />
                  <button
                    onClick={handleSaveSourceUrl}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setSourceUrl(webtoon.sourceUrl || "");
                      setEditingUrl(false);
                    }}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={sourceUrl || "No source URL"}
                    readOnly
                    className="flex-1 bg-gray-700/50 border border-gray-600 rounded px-3 py-2 text-gray-300 text-sm"
                  />
                  {isOwner && (
                    <button
                      onClick={() => setEditingUrl(true)}
                      className="text-emerald-400 hover:text-emerald-300 text-sm ml-2"
                    >
                      Edit
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center gap-4">
              <button
                onClick={() =>
                  isOwner && handleUpdate("status", webtoon.status === "Ongoing" ? "Completed" : "Ongoing")
                }
                disabled={!isOwner}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  webtoon.status === "Completed"
                    ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                } ${!isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {webtoon.status}
              </button>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <BookOpen size={16} />
                <input
                  type="number"
                  value={webtoon.totalEpisodes || 0}
                  onChange={(e) => isOwner && handleUpdate("totalEpisodes", parseInt(e.target.value, 10) || 0)}
                  disabled={!isOwner}
                  className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-center focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                  min="0"
                />
                <span>episodes</span>
              </div>
            </div>

            <div className="mt-4">
              <span className="text-sm text-gray-400 block mb-1">Rating</span>
              <StarRating
                rating={webtoon.rating || 0}
                onChange={(val) => isOwner && handleUpdate("rating", val)}
                readonly={!isOwner}
              />
            </div>

            <div className="mt-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-300">Reading Progress</h2>

              <ProgressTracker
                label={(() => {
                  const label = isOwner ? "My Progress" : profileLoading ? "Loading..." : `${profile?.displayName || 'Friend'}'s Progress`;
                  console.log("Progress label calculation:", { isOwner, profileLoading, profile: profile?.displayName, finalLabel: label });
                  return label;
                })()}
                icon={<User size={16} />}
                current={webtoon.myProgress || 0}
                total={webtoon.totalEpisodes || 0}
                percent={progressPercent(webtoon.myProgress || 0)}
                color="emerald"
                onChange={(val) => isOwner && handleUpdate("myProgress", val)}
                disabled={!isOwner}
              />

              {friendsProgress.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                    {/* <Users size={16} />
                    {isOwner ? "Friends' Progress" : "You"} */}
                  </h3>
                  <div className="space-y-3">
                    {friendsProgress.map((friend) => (
                      <div key={friend.userId} className="bg-gray-800/50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-violet-400">{friend.displayName}</span>
                          <span className="text-xs text-gray-400">{friend.myProgress} / {webtoon.totalEpisodes || 0}</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-violet-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progressPercent(friend.myProgress)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressTracker({ label, icon, current, total, percent, color, onChange, disabled = false }) {
  const barColor = color === "emerald" ? "bg-emerald-500" : "bg-violet-500";
  const textColor = color === "emerald" ? "text-emerald-400" : "text-violet-400";

  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={`flex items-center gap-2 text-sm font-medium ${textColor}`}>
          {icon}
          {label}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-white font-medium">Ep</span>
          <input
            type="number"
            value={current}
            onChange={(e) => onChange && onChange(parseInt(e.target.value, 10) || 0)}
            disabled={disabled}
            className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-center text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-50"
            min="0"
          />
          <span className="text-gray-500">/ {total}</span>
        </div>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2.5">
        <div
          className={`${barColor} h-2.5 rounded-full transition-all duration-300`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1 text-right">{percent}%</p>
    </div>
  );
}
