// 📄 src/pages/ai/AIContentGenerator.jsx
import React, { useState } from "react";
import { Sparkles, Copy, RefreshCw, Wand2, MessageSquare } from "lucide-react";

export default function AIContentGenerator() {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("Professional");
  const [type, setType] = useState("Promotional");
  const [generatedContent, setGeneratedContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const apiKey = ""; // Injected by environment

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic or key details.");
      return;
    }
    setError("");
    setLoading(true);
    setGeneratedContent("");

    const prompt = `Act as an expert WhatsApp Marketing Copywriter.
    Write a ${tone.toLowerCase()} ${type.toLowerCase()} message about: "${topic}".
    Requirements:
    - Keep it concise (under 1000 characters).
    - Use relevant emojis.
    - Format with bolding (*text*) for key offers.
    - Include a clear Call to Action (CTA).
    - Do NOT include subject lines or preambles, just the message body.`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      const text =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "No content generated. Please try again.";
      setGeneratedContent(text);
    } catch (err) {
      setError("Failed to generate content. " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="text-emerald-500 fill-emerald-100" />
          AI Content Studio
        </h1>
        <p className="text-gray-500 mt-1">
          Generate high-converting WhatsApp campaigns and templates instantly
          using Gemini.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: Input Controls */}
        <div className="lg:w-1/3 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Wand2 size={18} className="text-emerald-600" />
              Configuration
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message Type
                </label>
                <select
                  className="w-full border-gray-200 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500 p-2.5 bg-gray-50 border"
                  value={type}
                  onChange={e => setType(e.target.value)}
                >
                  <option value="Promotional">🎉 Promotional / Sale</option>
                  <option value="Transactional">📦 Order Update</option>
                  <option value="Support">🤝 Customer Support</option>
                  <option value="Newsletter">📰 Newsletter</option>
                  <option value="Recovery">🛒 Cart Recovery</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tone of Voice
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["Professional", "Friendly", "Urgent", "Witty"].map(t => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={`text-xs py-2 px-3 rounded-md border transition-all ${
                        tone === t
                          ? "bg-emerald-50 border-emerald-500 text-emerald-700 font-medium"
                          : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Topic & Key Details
                </label>
                <textarea
                  className="w-full border-gray-200 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500 p-3 bg-white border h-32 resize-none"
                  placeholder="e.g. Black Friday sale, 50% off all shoes, ends this Friday, use code BF50..."
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                />
              </div>

              {error && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded-md border border-red-100">
                  {error}
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={loading}
                className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                  loading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-200"
                }`}
              >
                {loading ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} />{" "}
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} /> Generate Content ✨
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Preview Output */}
        <div className="lg:w-2/3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <MessageSquare size={18} className="text-emerald-600" />
                Preview Result
              </h2>
              {generatedContent && (
                <button
                  onClick={copyToClipboard}
                  className="text-xs flex items-center gap-1.5 text-gray-600 hover:text-emerald-600 font-medium px-3 py-1.5 rounded-md hover:bg-white border border-transparent hover:border-gray-200 transition-all"
                >
                  <Copy size={14} /> Copy Text
                </button>
              )}
            </div>

            <div className="flex-1 p-6 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat bg-opacity-5 relative">
              <div className="absolute inset-0 bg-emerald-50/30 pointer-events-none"></div>

              {generatedContent ? (
                <div className="relative max-w-md bg-white p-4 rounded-lg shadow-sm rounded-tr-none border border-emerald-100 ml-auto mr-4 mt-4 animate-fadeIn">
                  <div className="whitespace-pre-wrap text-gray-800 text-sm leading-relaxed font-sans">
                    {generatedContent}
                  </div>
                  <div className="text-[10px] text-gray-400 text-right mt-2 flex items-center justify-end gap-1">
                    Generated by Gemini <Sparkles size={10} />
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 relative z-10">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                    <Wand2 size={24} className="text-emerald-200" />
                  </div>
                  <p className="text-sm font-medium">Ready to create magic.</p>
                  <p className="text-xs mt-1">
                    Configure your campaign details on the left.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
