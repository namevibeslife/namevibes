import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Atom, BookOpen } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import Logo from '../components/Logo';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuthStore();

  return (
    <div className="min-h-screen site-background">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center">
          <Logo className="h-20 sm:h-28 md:h-32 w-auto" />
        </div>
        {loading ? (
          <div className="h-10 w-28" aria-hidden="true" />
        ) : user ? (
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-5 py-2 text-brand-600 border-2 border-brand-200 rounded-lg hover:bg-paper transition"
            >
              Dashboard
            </button>
            <button
              onClick={logout}
              className="px-5 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition"
          >
            Sign In
          </button>
        )}
      </header>

      {/* Hero Section */}
      <section className="landing-hero container mx-auto px-4 py-20 text-center">
        <p className="hero-kicker">Your name is energy. Discover how it connects you to the universe.</p>
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Discover Your Name's<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-ocean-600">
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
            className="px-8 py-4 bg-gradient-to-r from-brand-600 to-ocean-600 text-white text-lg font-semibold rounded-xl hover:from-brand-700 hover:to-ocean-700 transform hover:scale-105 transition shadow-lg"
          >
            <Sparkles className="inline mr-2" size={20} />
            Get Started
          </button>
          <button
            onClick={() => navigate('/learn-more')}
            className="px-8 py-4 bg-paper text-brand-600 text-lg font-semibold rounded-xl hover:bg-gray-50 transition shadow-lg border-2 border-brand-200"
          >
            <BookOpen className="inline mr-2" size={20} />
            Learn More
          </button>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-14 text-center" aria-labelledby="about-namevibes">
        <h2 id="about-namevibes" className="text-3xl text-brand-800 mb-6">A lifelong companion. A world within.</h2>
        <div className="space-y-4 text-gray-700 text-lg">
          <p>From the cradle to the grave, your name is your constant companion, defining your identity throughout life's journey.</p>
          <p>Every name carries a unique vibration, an energy that resonates with who you are.</p>
          <p>But have you ever wondered what lies within the letters of your name?</p>
          <p><strong>NameVibes</strong> uncovers the fascinating connection between your name and the elements of the periodic table.</p>
          <p className="font-semibold text-brand-700">Discover the elements. Explore the connections. Feel your NameVibes.</p>
        </div>
      </section>
      <section className="landing-showcase" aria-label="Example name poster"><p className="text-center text-brand-600 text-sm mb-4 tracking-widest uppercase">Your name, beautifully elemental / Sample poster</p><a href="/theme/vibes-sample.png" target="_blank" rel="noopener noreferrer" aria-label="View the Vibes sample poster full size"><img src="/theme/vibes-sample.png" alt="NameVibes: how your name becomes a chemistry poster. Vibes maps to V (Vanadium), I (Iodine), Be (Beryllium), and S (Sulfur)." width="1200" height="1312" className="sample-artwork" loading="lazy" /><span className="block text-center text-brand-700 underline mt-3">View sample full size</span></a></section>
      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-paper rounded-2xl p-8 shadow-xl">
            <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mb-4">
              <Atom className="w-8 h-8 text-brand-600" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Periodic Elements</h3>
            <p className="text-gray-600">
              Break down your name into chemical elements and discover their unique properties and meanings
            </p>
          </div>

          <div className="bg-paper rounded-2xl p-8 shadow-xl">
            <div className="w-16 h-16 bg-ocean-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl font-bold text-ocean-600">9</span>
            </div>
            <h3 className="text-2xl font-bold mb-3">Chaldean Numerology</h3>
            <p className="text-gray-600">
              Uncover your life path number, name number, and destiny through ancient wisdom
            </p>
          </div>

          <div className="bg-paper rounded-2xl p-8 shadow-xl">
            <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-brand-600">ॐ</span>
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
        <div className="bg-gradient-to-r from-brand-600 to-ocean-600 rounded-3xl p-12 text-white">
          <h2 className="text-4xl font-bold mb-4">Ready to Discover Your Vibes?</h2>
          <p className="text-xl mb-8 opacity-90">See which elements of the universe live in your name</p>
          <button
            onClick={() => navigate('/login')}
            className="px-10 py-4 bg-paper text-brand-600 text-lg font-semibold rounded-xl hover:bg-gray-100 transition shadow-xl"
          >
            Start Your Journey
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-gray-600">
        <p>© {new Date().getFullYear()} NameVibes. All rights reserved.</p>
      </footer>
    </div>
  );
}
