import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { UserPlus, Check, X, Loader2, User } from "lucide-react";

export default function Notifications({ user }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Listen for follow requests where current user is the target
    const q = query(
      collection(db, "followRequests"),
      where("targetUserId", "==", user.uid),
      where("status", "==", "pending")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRequests(items);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-emerald-400" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        <span className="text-emerald-400">Friend</span> Requests
      </h1>

      {requests.length === 0 ? (
        <div className="text-center py-12 bg-gray-900 rounded-xl border border-gray-800">
          <User className="mx-auto text-gray-600 mb-4" size={48} />
          <p className="text-gray-400">No pending friend requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex justify-between items-center">
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
      )}
    </div>
  );
}