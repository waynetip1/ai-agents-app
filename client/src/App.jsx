import { useState } from 'react';

function App() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResponse('');

    try {
      const res = await fetch('http://localhost:3001/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      setResponse(data.response || 'No response');
    } catch (err) {
      setResponse('Error contacting the agent');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
      <div className="max-w-xl w-full">
        <h1 className="text-3xl font-bold mb-6 text-center">AI Agent 🤖</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            className="w-full p-4 text-black rounded"
            rows="4"
            placeholder="Enter a task or question..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            required
          />

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded font-semibold"
          >
            {loading ? 'Asking agent...' : 'Ask Agent'}
          </button>
        </form>

        {response && (
          <div className="mt-6 bg-gray-800 p-4 rounded">
            <h2 className="font-semibold mb-2">Response:</h2>
            <pre className="whitespace-pre-wrap font-mono text-sm">{response}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
