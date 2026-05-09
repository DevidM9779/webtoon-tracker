import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, deleteDoc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Activity, Star, BookOpen, PlusCircle, CheckCircle, Users, UserPlus, Check, X, Loader2, User } from "lucide-react";

export default function Feed({ user }) {
  const [activities, setActivities] = useState([]);
  const [followingIds, setFollowingIds] = useState([]);
  const [followingData, setFollowingData] = useState({}); // Store friendship timestamps
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Get the list of User IDs you are currently following
  useEffect(() => {
    if (!user) return;
    const unsubFollow = onSnapshot(collection(db, `users/${user.uid}/following`), (snap) => {
      const ids = snap.docs.map(doc => doc.id);
      const data = {};
      snap.docs.forEach(doc => {
        data[doc.id] = {
          followedAt: doc.data().followedAt || new Date().toISOString()
        };
      });
      setFollowingIds(ids);
      setFollowingData(data);
    });
    return () => unsubFollow();
  }, [user]);

  // Listen for follow requests where current user is the target
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "followRequests"),
      where("targetUserId", "==", user.uid),
      where("status", "==", "pending")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRequests(items);
    });
    return () => unsub();
  }, [user]);

  // Fetch the activities feed and filter it
  useEffect(() => {
    const q = query(collection(db, "activities"), orderBy("createdAt", "desc"));
    const unsubActivities = onSnapshot(q, (snapshot) => {
      const allActivities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Only show activities from users you follow AND that occurred after friendship was established
      const filteredFeed = allActivities.filter(activity => {
        if (!followingIds.includes(activity.userId)) return false;
        
        const friendship = followingData[activity.userId];
        if (!friendship) return false;
        
        const activityTime = new Date(activity.createdAt).getTime();
        const friendshipTime = new Date(friendship.followedAt).getTime();
        
        // Only show activities that occurred after the friendship was established
        return activityTime >= friendshipTime;
      });
      setActivities(filteredFeed);
      setLoading(false);
    });
    return () => unsubActivities;
  }, [followingIds, followingData]);

  const handleAcceptRequest = async (request) => {
    try {
      // Update follow request status
      await updateDoc(doc(db, "followRequests", request.id), {
        status: "accepted",
        respondedAt: new Date().toISOString()
      });

      // Add to current user's friends collection (create new document)
      await setDoc(doc(db, `users/${user.uid}/following`, request.requesterId), {
        userId: request.requesterId,
        displayName: request.requesterName,
        followedAt: new Date().toISOString()
      });

      // Add reverse friendship (bidirectional)
      await setDoc(doc(db, `users/${request.requesterId}/following`, user.uid), {
        userId: user.uid,
        displayName: user.displayName || "Anonymous",
        followedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error accepting request:", error);
      alert("Failed to accept friend request");
    }
  };

  const handleRejectRequest = async (request) => {
    try {
      await updateDoc(doc(db, "followRequests", request.id), {
        status: "rejected",
        respondedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error rejecting request:", error);
      alert("Failed to reject friend request");
    }
  };

  const getIcon = (type) => {
    switch(type) {
      case "ADD": return <PlusCircle className="text-emerald-400" size={20} />;
      case "PROGRESS": return <BookOpen className="text-blue-400" size={20} />;
      case "COMPLETE": return <CheckCircle className="text-violet-400" size={20} />;
      case "RATING": return <Star className="text-yellow-400" size={20} />;
      default: return <Activity className="text-gray-400" size={20} />;
    }
  };

  if (loading) return <div className="text-center py-20">Loading feed...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        <span className="text-emerald-400">Activity</span> Feed
      </h1>

      {/* Friend Requests Section */}
      {requests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <UserPlus className="text-emerald-400" size={20} />
            Friend Requests ({requests.length})
          </h2>
          <div className="space-y-3">
            {requests.map((request) => (
              <div key={request.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
                    {request.requesterName ? request.requesterName.charAt(0).toUpperCase() : "?"}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{request.requesterName}</p>
                    <p className="text-sm text-gray-400">wants to be your friend</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptRequest(request)}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    <Check size={18} /> Accept
                  </button>
                  <button
                    onClick={() => handleRejectRequest(request)}
                    className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    <X size={18} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Feed Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="text-gray-400" size={20} />
          Recent Activity
        </h2>
        
        {followingIds.length === 0 ? (
          <div className="text-center py-20 bg-gray-900 rounded-xl border border-gray-800">
            <Users className="mx-auto text-gray-600 mb-4" size={48} />
            <h2 className="text-xl text-gray-400 font-semibold mb-2">Your feed is empty</h2>
            <p className="text-gray-500">Go to the Search tab to find and follow your friends!</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-20 bg-gray-900 rounded-xl border border-gray-800">
            <Activity className="mx-auto text-gray-600 mb-4" size={48} />
            <p className="text-gray-500">No recent activity from your friends.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((post) => (
              <div key={post.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-start gap-4">
                <div className="mt-1 bg-gray-800 p-2 rounded-full">
                  {getIcon(post.type)}
                </div>
                <div>
                  <p className="text-gray-300">
                    <Link to={`/profile/${post.userId}`} className="font-semibold text-white hover:text-emerald-400 transition-colors">
                      {post.userName}
                    </Link> {post.details}
                  </p>
                  <div className="mt-2 bg-gray-800 rounded px-3 py-2 inline-block">
                    <span className="text-sm font-medium text-emerald-400">{post.webtoonTitle}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(post.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}