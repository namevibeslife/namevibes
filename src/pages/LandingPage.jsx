import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Atom, BookOpen } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Atom className="w-8 h-8 text-purple-600" />
          <span className="text-2xl font-bold text-gray-800">NameVibes</span>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
        >
          Sign In
        </button>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Discover Your Name's<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
            Hidden Chemistry
          </span>
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Decode the hidden elements in your identity through periodic table science,
          Chaldean numerology, and Hindu astrology
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/login')}
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-lg font-semibold rounded-xl hover:from-purple-700 hover:to-blue-700 transform hover:scale-105 transition shadow-lg"
          >
            <Sparkles className="inline mr-2" size={20} />
            Get Started
          </button>
          <button
            onClick={() => navigate('/learn-more')}
            className="px-8 py-4 bg-white text-purple-600 text-lg font-semibold rounded-xl hover:bg-gray-50 transition shadow-lg border-2 border-purple-200"
          >
            <BookOpen className="inline mr-2" size={20} />
            Learn More
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <Atom className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Periodic Elements</h3>
            <p className="text-gray-600">
              Break down your name into chemical elements and discover their unique properties and meanings
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl font-bold text-blue-600">9</span>
            </div>
            <h3 className="text-2xl font-bold mb-3">Chaldean Numerology</h3>
            <p className="text-gray-600">
              Uncover your life path number, name number, and destiny through ancient wisdom
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-indigo-600">ॐ</span>
            </div>
            <h3 className="text-2xl font-bold mb-3">Hindu Astrology</h3>
            <p className="text-gray-600">
              Learn which syllables are auspicious for you based on your birth date and nakshatra
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl p-12 text-white">
          <h2 className="text-4xl font-bold mb-4">Ready to Discover Your Vibes?</h2>
          <p className="text-xl mb-8 opacity-90">Join 10,000+ users who found their name chemistry</p>
          <button
            onClick={() => navigate('/login')}
            className="px-10 py-4 bg-white text-purple-600 text-lg font-semibold rounded-xl hover:bg-gray-100 transition shadow-xl"
          >
            Start Your Journey
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-gray-600">
        <p>© 2025 NameVibes. All rights reserved.</p>
      </footer>
    </div>
  );
}