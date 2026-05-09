import { useState } from "react";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Basic validation
    if (!email.trim()) {
      setError("Email is required");
      setLoading(false);
      return;
    }
    if (!password.trim()) {
      setError("Password is required");
      setLoading(false);
      return;
    }
    if (!isLogin && !name.trim()) {
      setError("Display name is required");
      setLoading(false);
      return;
    }
    if (!isLogin && password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }
    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update auth profile
        await updateProfile(user, { displayName: name });
        
        // Create social profile in Firestore
        await setDoc(doc(db, "users", user.uid), {
          displayName: name,
          email: email,
          stats: { tracked: 0, episodesRead: 0, finished: 0 },
          favoriteIds: [],
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      // Provide more user-friendly error messages
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError("An account with this email already exists");
          break;
        case 'auth/invalid-email':
          setError("Invalid email address");
          break;
        case 'auth/weak-password':
          setError("Password is too weak");
          break;
        case 'auth/user-not-found':
          setError("No account found with this email");
          break;
        case 'auth/wrong-password':
          setError("Incorrect password");
          break;
        default:
          setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white mb-4 focus:border-emerald-500 focus:outline-none";
  
  const passwordInputClass = "w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white mb-4 focus:border-emerald-500 focus:outline-none pr-10";

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 p-8 rounded-xl w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center text-emerald-400">Webtoon Tracker</h1>
        <h2 className="text-xl mb-6 text-center">{isLogin ? "Welcome Back" : "Create Account"}</h2>
        
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <input type="text" placeholder="Display Name" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
          )}
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} />
          
          <div className="relative mb-4">
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              className={passwordInputClass} 
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {!isLogin && (
            <div className="relative mb-4">
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                placeholder="Confirm Password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                required 
                className={passwordInputClass} 
              />
              <button 
                type="button" 
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          )}
          
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          
          <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg flex justify-center items-center">
            {loading ? <Loader2 className="animate-spin" /> : (isLogin ? "Sign In" : "Sign Up")}
          </button>
        </form>

        <button onClick={() => setIsLogin(!isLogin)} className="w-full text-center mt-4 text-gray-400 hover:text-white">
          {isLogin ? "Need an account? Sign Up" : "Already have an account? Sign In"}
        </button>
      </div>
    </div>
  );
}