import { useEffect, useState } from "react";

export default function App() {
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
      const res = await fetch("http://localhost:3001/api/emails/analyze", {
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
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans antialiased flex flex-col">
      <header className="w-full px-6 py-4 shadow-sm border-b bg-white">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-indigo-600">📬 AI Inbox Agent</h1>
          <span className="text-sm text-gray-500">v1.0</span>
        </div>
      </header>

      <main className="flex-grow px-6 py-12 max-w-5xl mx-auto w-full">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-extrabold text-gray-800 mb-2">
            Clean your inbox. Automatically.
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Get AI-powered suggestions to reply, archive, or ignore.
          </p>

          <button
            onClick={analyzeEmails}
            className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full font-medium shadow transition"
          >
            {loading ? "Analyzing..." : "Analyze Emails"}
          </button>
        </div>

        {suggestions.length > 0 && (
          <div className="space-y-6">
            {suggestions.map((s, i) => (
              <div
                key={i}
                className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
              >
                <p className="text-lg font-semibold text-gray-800">📨 {s.subject}</p>
                <p className="text-sm text-gray-500 mb-3">
                  <span className="font-medium">From:</span> {s.from} <br />
                  <span className="font-medium">Date:</span> {s.date}
                </p>
                <p>
                  ✅ <span className="text-green-600 font-medium">Action:</span> {s.action}
                </p>
                <p>
                  💬 <span className="text-yellow-600 font-medium">Reason:</span> {s.reason}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="text-center text-sm text-gray-400 py-6 border-t bg-white">
        Built with ❤️ by You — 2025
      </footer>
    </div>
  );
}
