import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { User, Mail, LogOut, Shield } from "lucide-react";

export default function Account({ user }) {
  
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Account Settings</h1>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        
        {/* Profile Header Block */}
        <div className="bg-gray-800 p-6 flex flex-col items-center border-b border-gray-700">
          <div className="w-24 h-24 bg-emerald-600 rounded-full flex items-center justify-center text-4xl font-bold text-white mb-4">
            {user.displayName ? user.displayName.charAt(0).toUpperCase() : <User size={40} />}
          </div>
          <h2 className="text-xl font-bold">{user.displayName || "Anonymous User"}</h2>
        </div>

        {/* User Details Block */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4 text-gray-300 bg-gray-800/50 p-3 rounded-lg">
            <Mail className="text-gray-500" size={20} />
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Email Address</p>
              <p>{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-gray-300 bg-gray-800/50 p-3 rounded-lg">
            <Shield className="text-gray-500" size={20} />
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">User ID</p>
              <p className="font-mono text-sm">{user.uid}</p>
            </div>
          </div>
        </div>

        {/* Logout Action */}
        <div className="p-6 bg-gray-900 border-t border-gray-800">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 py-3 rounded-lg font-bold transition-colors"
          >
            <LogOut size={18} />
            Log Out
          </button>
        </div>

      </div>
    </div>
  );
}