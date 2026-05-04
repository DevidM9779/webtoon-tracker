import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Detail from "./pages/Detail";
import AddWebtoon from "./pages/AddWebtoon";
import Navbar from "./components/Navbar";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-950 text-white">
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/add" element={<AddWebtoon />} />
            <Route path="/webtoon/:id" element={<Detail />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
