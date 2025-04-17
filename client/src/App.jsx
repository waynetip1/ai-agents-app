import { useState } from "react";

function App() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Simulated test emails (replace later with real Gmail fetch)
  const testEmails = [
    {
      subject: "Follow up on meeting notes",
      from: "client@example.com",
      date: "Mon, 15 Apr 2024 09:00:00 -0500",
    },
    {
      subject: "Your invoice is ready",
      from: "billing@company.com",
      date: "Mon, 15 Apr 2024 08:45:00 -0500",
    },
  ];

  const analyzeEmails = async () => {
    setLoading(true);
    setSuggestions([]);

    try {
      const res = await fetch("http://localhost:3001/api/emails/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: testEmails }),
      });

      const data = await res.json();
      const parsed = JSON.parse(data.suggestions); // GPT returns stringified JSON
      setSuggestions(parsed);
    } catch (err) {
      console.error("Failed to analyze emails:", err);
      setSuggestions([{ subject: "Error", action: "none", reason: "Failed to analyze." }]);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold mb-4">📬 AI Inbox Agent</h1>

      <button
        onClick={analyzeEmails}
        className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded text-lg"
      >
        {loading ? "Analyzing..." : "Analyze Emails"}
      </button>

      {suggestions.length > 0 && (
        <div className="mt-6 w-full max-w-2xl space-y-4">
          {suggestions.map((s, i) => (
            <div key={i} className="bg-gray-800 p-4 rounded">
              <p><strong>📨 Subject:</strong> {s.subject}</p>
              <p><strong>✅ Suggested Action:</strong> {s.action}</p>
              <p><strong>💬 Reason:</strong> {s.reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
