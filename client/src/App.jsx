import { useEffect, useState } from "react";

function App() {
  const [emails, setEmails] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ Load structured Gmail emails from redirect URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawEmails = params.get("emails");

    if (rawEmails) {
      try {
        const parsed = JSON.parse(decodeURIComponent(rawEmails));
        const structured = parsed.filter(e => e.subject && e.from && e.date);
        setEmails(structured);
      } catch (err) {
        console.error("❌ Failed to parse emails from URL:", err);
      }
    }
  }, []);

  // 🧠 Analyze emails using GPT
  const analyzeEmails = async () => {
    setLoading(true);
    setSuggestions([]);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/emails/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });

      const data = await res.json();
      let parsed;
      try {
        const cleaned = data.suggestions
          .replace(/^```json/, "")
          .replace(/^```/, "")
          .replace(/```$/, "")
          .trim();
        parsed = JSON.parse(cleaned);
      } catch (err) {
        console.error("❌ GPT returned invalid JSON:", data.suggestions);
        parsed = [{ subject: "Error", action: "none", reason: "Could not parse GPT response" }];
      }

      setSuggestions(parsed);
    } catch (err) {
      console.error("❌ Failed to analyze emails:", err);
      setSuggestions([{ subject: "Error", action: "none", reason: "Failed to analyze." }]);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans flex flex-col">
      {/* Header */}
      <header className="w-full px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/60 backdrop-blur-md">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          📬 AI Inbox Agent
        </h1>
        <div className="text-sm text-gray-400 font-medium">v1.0</div>
      </header>

      {/* Main Content */}
      <main className="flex-grow px-4 sm:px-8 py-10 max-w-4xl mx-auto w-full">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-3 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-500 text-transparent bg-clip-text">
            Clean your inbox. Automatically.
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Get instant AI-powered suggestions for how to handle your unread emails — reply, archive, or ignore.
          </p>
          <button
            onClick={analyzeEmails}
            className="mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-purple-600 hover:to-pink-600 transition-all px-8 py-3 rounded-full text-lg font-semibold shadow-md shadow-blue-700/30"
          >
            {loading ? "Analyzing..." : "Analyze Emails"}
          </button>
        </div>

        {/* Results */}
        {suggestions.length > 0 && (
          <section className="space-y-8">
            {suggestions.map((s, i) => (
              <div
                key={i}
                className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-gray-800/70 via-gray-900/50 to-gray-950/80 border border-gray-700 shadow-xl hover:shadow-pink-500/20 transition-all duration-300 group"
              >
                <div className="absolute inset-0 blur-lg opacity-20 group-hover:opacity-30 transition-all bg-gradient-to-tr from-blue-500/20 via-purple-400/20 to-pink-500/20" />
                <div className="relative z-10">
                  <p className="text-2xl font-bold text-blue-300 mb-1">📨 {s.subject}</p>
                  <p className="text-sm text-gray-400 mb-3">
                    <span className="font-medium">From:</span> {s.from}<br />
                    <span className="font-medium">Date:</span> {s.date}
                  </p>
                  <p className="mb-1">
                    ✅ <span className="text-green-400 font-semibold">Action:</span> {s.action}
                  </p>
                  <p>
                    💬 <span className="text-yellow-300 font-semibold">Reason:</span> {s.reason}
                  </p>
                </div>
              </div>
            ))}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-gray-500 text-sm py-6 border-t border-gray-800">
        Built with ❤️ by You — 2025
      </footer>
    </div>
  );
}

export default App;
