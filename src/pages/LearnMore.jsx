import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function LearnMore() {
  const [mode, setMode] = useState("science");
  const navigate = useNavigate();
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 px-6 py-12">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8">
        
        <h1 className="text-3xl font-bold text-gray-800 mb-4 text-center">
          Learn More
        </h1>

        {/* Navigation */}
        <div className="flex justify-center gap-6 mb-8">
          <button
            onClick={() => navigate("/")}
            className="text-purple-600 font-semibold hover:underline"
          >
            Home
          </button>

          {user && (
            <button
              onClick={() => navigate("/dashboard")}
              className="text-purple-600 font-semibold hover:underline"
            >
              Dashboard
            </button>
          )}
        </div>

        {/* Toggle */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setMode("science")}
            className={`px-6 py-2 rounded-full font-semibold transition ${
              mode === "science"
                ? "bg-purple-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            🔬 Science
          </button>
          <button
            onClick={() => setMode("spiritual")}
            className={`px-6 py-2 rounded-full font-semibold transition ${
              mode === "spiritual"
                ? "bg-purple-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            ✨ Spiritual
          </button>
        </div>

        {/* Content */}
        {mode === "science" ? (
          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p>
              <strong>NameVibes</strong> explores how identity can be understood
              through <strong>chemistry, structure, and vibration</strong>.
            </p>

            <p>Every name can be mapped to:</p>

            <ul className="list-disc list-inside pl-4">
              <li>Chemical elements from the Periodic Table</li>
              <li>Atomic properties and elemental color frequencies</li>
              <li>Sound-based vibrational patterns</li>
            </ul>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="font-semibold">Example:</p>
              <p className="font-mono">
                BLESSINGS → B – Li – Es – S – In – G – S
              </p>
            </div>

            <p>
              These elements together form a{" "}
              <strong>Name Chemistry Signature</strong>, offering insight into
              personality traits, emotional balance, and compatibility.
            </p>

            <p className="font-semibold text-purple-600">
              Right vibrations create better alignment.
            </p>
          </div>
        ) : (
          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p>
              At <strong>NameVibes</strong>, we see the universe as energy in
              motion — and sound as its first expression.
            </p>

            <p className="italic">
              A name carries sound.<br />
              Sound carries vibration.<br />
              Vibration shapes experience.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="font-semibold">Example:</p>
              <p className="font-mono">
                BLESSINGS → B – Li – Es – S – In – G – S
              </p>
            </div>

            <p>
              Each sound resonates with an element, a color, and a cosmic
              frequency — forming your unique{" "}
              <strong>energetic signature</strong>.
            </p>

            <p className="font-semibold text-purple-600">
              Right vibes matter — whether it’s a name, a child, or a brand.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
