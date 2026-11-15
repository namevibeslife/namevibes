import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function LearnMore() {
  const [mode, setMode] = useState("science");
  const navigate = useNavigate();
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen site-background px-6 py-12">
      <div className="max-w-4xl mx-auto bg-paper rounded-2xl shadow-lg p-8">
        
        <h1 className="text-3xl font-bold text-gray-800 mb-4 text-center">
          Learn More
        </h1>

        {/* Navigation */}
        <div className="flex justify-center gap-6 mb-8">
          <button
            onClick={() => navigate("/")}
            className="text-brand-600 font-semibold hover:underline"
          >
            Home
          </button>

          {user && (
            <button
              onClick={() => navigate("/dashboard")}
              className="text-brand-600 font-semibold hover:underline"
            >
              Dashboard
            </button>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-8" aria-label="Learn more topics">
          {[["science", "Science"], ["spiritual", "Spiritual"], ["explainer", "How It Works"]].map(([key, label]) => (
            <button key={key} onClick={() => setMode(key)} aria-pressed={mode === key}
              className={`px-5 py-3 rounded-full font-semibold transition ${mode === key ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {mode === "explainer" ? (
          <section aria-label="How NameVibes works" className="space-y-4 text-center">
            <h2 className="text-2xl text-brand-700">The Chemistry of Your Name</h2>
            <p>Explore the letters, discover the elements, and create your own NameVibes poster.</p>
            <a href="/theme/vibes-sample.png" target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-amber-200 shadow-lg">
              <img src="/theme/vibes-sample.png" alt="NameVibes illustrated guide: Vibes becomes Vanadium (V), Iodine (I), Beryllium (Be), and Sulfur (S). Discover your name's elements and create a poster to save and share." className="w-full h-auto" />
            </a>
            <a href="/theme/vibes-sample.png" target="_blank" rel="noreferrer" className="inline-block underline text-brand-700 py-2">View the explainer full size</a>
          </section>
        ) : mode === "science" ? (
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

            <div className="bg-brand-50 border border-brand-200 rounded-lg p-4">
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

            <p className="font-semibold text-brand-600">
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

            <div className="bg-ocean-50 border border-ocean-200 rounded-lg p-4">
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

            <p className="font-semibold text-brand-600">
              Right vibes matter — whether it’s a name, a child, or a brand.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
