import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Mock stock data with realistic prices and company info
const mockStocks = [
  {
    id: 'NFLX',
    symbol: 'NFLX',
    name: 'Netflix Inc.',
    price: 487.23,
    change: 12.45,
    changePercent: 2.62,
    logo: '🎬',
    color: 'from-red-500 to-red-600',
    description: 'Leading streaming entertainment service with over 260M subscribers worldwide.'
  },
  {
    id: 'GOOGL',
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    price: 174.82,
    change: -2.18,
    changePercent: -1.23,
    logo: '🔍',
    color: 'from-blue-500 to-blue-600',
    description: 'Technology conglomerate specializing in Internet-related services and products.'
  },
  {
    id: 'TSLA',
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    price: 248.95,
    change: 8.73,
    changePercent: 3.63,
    logo: '⚡',
    color: 'from-green-500 to-green-600',
    description: 'Electric vehicle and clean energy company revolutionizing transportation.'
  },
  {
    id: 'AMZN',
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    price: 186.71,
    change: 5.12,
    changePercent: 2.82,
    logo: '📦',
    color: 'from-orange-500 to-orange-600',
    description: 'E-commerce and cloud computing giant serving millions globally.'
  },
  {
    id: 'META',
    symbol: 'META',
    name: 'Meta Platforms Inc.',
    price: 528.14,
    change: -7.25,
    changePercent: -1.35,
    logo: '👥',
    color: 'from-blue-600 to-purple-600',
    description: 'Social technology company connecting billions through virtual reality and social platforms.'
  },
  {
    id: 'CRM',
    symbol: 'CRM',
    name: 'Salesforce Inc.',
    price: 312.45,
    change: 4.67,
    changePercent: 1.52,
    logo: '☁️',
    color: 'from-cyan-500 to-blue-500',
    description: 'Leading customer relationship management platform for businesses.'
  },
  {
    id: 'MNST',
    symbol: 'MNST',
    name: 'Monster Beverage Corp.',
    price: 52.89,
    change: 1.23,
    changePercent: 2.38,
    logo: '🥤',
    color: 'from-green-600 to-yellow-500',
    description: 'Energy drink company with popular Monster Energy brand worldwide.'
  },
  {
    id: 'CMG',
    symbol: 'CMG',
    name: 'Chipotle Mexican Grill',
    price: 3247.12,
    change: 45.78,
    changePercent: 1.43,
    logo: '🌯',
    color: 'from-red-600 to-orange-500',
    description: 'Fast-casual restaurant chain serving responsibly sourced Mexican food.'
  },
  {
    id: 'BIIB',
    symbol: 'BIIB',
    name: 'Biogen Inc.',
    price: 155.67,
    change: -3.21,
    changePercent: -2.02,
    logo: '🧬',
    color: 'from-purple-500 to-indigo-600',
    description: 'Biotechnology company focused on neurological and neurodegenerative diseases.'
  },
  {
    id: 'BRK.B',
    symbol: 'BRK.B',
    name: 'Berkshire Hathaway Inc.',
    price: 459.23,
    change: 2.45,
    changePercent: 0.54,
    logo: '💎',
    color: 'from-gray-600 to-gray-700',
    description: 'Warren Buffett\'s conglomerate with diverse portfolio of businesses and investments.'
  }
];

function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('home');
  const [selectedStock, setSelectedStock] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState('login');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUserData();
    }
  }, []);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BACKEND_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
      setPortfolio(response.data.portfolio || []);
    } catch (error) {
      console.error('Error fetching user data:', error);
      localStorage.removeItem('token');
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const response = await axios.post(`${BACKEND_URL}${endpoint}`, {
        email,
        password
      });
      
      localStorage.setItem('token', response.data.access_token);
      setUser(response.data.user);
      setCurrentView('dashboard');
      setEmail('');
      setPassword('');
    } catch (error) {
      alert(error.response?.data?.detail || 'Authentication failed');
    }
  };

  const handleInvestment = async () => {
    if (!investmentAmount || !selectedStock) return;
    
    const amount = parseFloat(investmentAmount);
    if (amount < 1) {
      alert('Minimum investment is $1');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${BACKEND_URL}/api/investments/buy`, {
        stock_symbol: selectedStock.symbol,
        amount: amount
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setPortfolio(response.data.portfolio);
      setInvestmentAmount('');
      setCurrentView('portfolio');
      alert(`Successfully invested $${amount} in ${selectedStock.name}!`);
    } catch (error) {
      alert(error.response?.data?.detail || 'Investment failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setCurrentView('home');
    setPortfolio([]);
  };

  const calculatePortfolioValue = () => {
    return portfolio.reduce((total, holding) => {
      const currentStock = mockStocks.find(s => s.symbol === holding.stock_symbol);
      if (currentStock) {
        const currentValue = (holding.shares * currentStock.price);
        return total + currentValue;
      }
      return total;
    }, 0);
  };

  const calculatePortfolioGain = () => {
    return portfolio.reduce((total, holding) => {
      const currentStock = mockStocks.find(s => s.symbol === holding.stock_symbol);
      if (currentStock) {
        const currentValue = (holding.shares * currentStock.price);
        const gain = currentValue - holding.invested_amount;
        return total + gain;
      }
      return total;
    }, 0);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0">
            <img 
              src="https://images.unsplash.com/photo-1560221328-12fe60f83ab8"
              alt="Stock Market"
              className="w-full h-full object-cover opacity-20"
            />
          </div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center">
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
                <span className="bg-gradient-to-r from-orange-400 to-blue-500 bg-clip-text text-transparent">
                  6ex
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
                Own pieces of the world's most valuable companies. Start with just <span className="text-green-400 font-bold">$1</span>.
              </p>
              <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
                The same Tesla, Apple, and Netflix shares that billionaires own. Now accessible to everyone through fractional investing.
              </p>
              
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-md mx-auto">
                <h3 className="text-xl font-semibold text-white mb-6">
                  {authMode === 'login' ? 'Welcome Back' : 'Join 6ex Today'}
                </h3>
                
                <form onSubmit={handleAuth} className="space-y-4">
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                  >
                    {authMode === 'login' ? 'Sign In' : 'Create Account'}
                  </button>
                </form>
                
                <p className="text-gray-300 text-sm mt-4">
                  {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
                  <button
                    onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                    className="text-blue-400 hover:text-blue-300 font-medium"
                  >
                    {authMode === 'login' ? 'Sign up' : 'Sign in'}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Preview */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-gradient-to-r from-green-500 to-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Start Small</h3>
              <p className="text-gray-400">Invest as little as $1 in premium stocks</p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📈</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Real Returns</h3>
              <p className="text-gray-400">Track your portfolio growth in real-time</p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🏆</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Premium Access</h3>
              <p className="text-gray-400">Own pieces of elite companies</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-blue-600 bg-clip-text text-transparent">
                6ex
              </h1>
              <div className="hidden md:flex space-x-6">
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    currentView === 'dashboard' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Discover
                </button>
                <button
                  onClick={() => setCurrentView('portfolio')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    currentView === 'portfolio' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Portfolio
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user.email}</span>
              <button
                onClick={logout}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {currentView === 'dashboard' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Premium Stocks</h2>
            <p className="text-gray-600">Own fractions of the world's most valuable companies</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockStocks.map((stock) => (
              <div
                key={stock.id}
                onClick={() => {
                  setSelectedStock(stock);
                  setCurrentView('invest');
                }}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden group"
              >
                <div className={`h-24 bg-gradient-to-r ${stock.color} flex items-center justify-center`}>
                  <span className="text-4xl">{stock.logo}</span>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{stock.symbol}</h3>
                      <p className="text-sm text-gray-600">{stock.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-xl text-gray-900">${stock.price.toFixed(2)}</p>
                      <p className={`text-sm ${stock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">{stock.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Min: $1</span>
                    <span className="text-blue-600 font-medium group-hover:text-blue-700">
                      Invest Now →
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentView === 'invest' && selectedStock && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => setCurrentView('dashboard')}
            className="mb-6 text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Stocks
          </button>

          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className={`h-32 bg-gradient-to-r ${selectedStock.color} flex items-center justify-center`}>
              <span className="text-6xl">{selectedStock.logo}</span>
            </div>
            
            <div className="p-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{selectedStock.name}</h1>
                  <p className="text-xl text-gray-600 mb-4">{selectedStock.symbol}</p>
                  <p className="text-gray-600 mb-6">{selectedStock.description}</p>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Current Price</span>
                      <span className="font-bold text-xl">${selectedStock.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">24h Change</span>
                      <span className={`font-medium ${selectedStock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedStock.change >= 0 ? '+' : ''}${selectedStock.change.toFixed(2)} ({selectedStock.changePercent.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Invest in {selectedStock.symbol}</h3>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Investment Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-500">$</span>
                        <input
                          type="number"
                          min="1"
                          step="0.01"
                          value={investmentAmount}
                          onChange={(e) => setInvestmentAmount(e.target.value)}
                          className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="10.00"
                        />
                      </div>
                      {investmentAmount && (
                        <p className="text-sm text-gray-600 mt-2">
                          You'll own {(parseFloat(investmentAmount) / selectedStock.price).toFixed(6)} shares
                        </p>
                      )}
                    </div>

                    <button
                      onClick={handleInvestment}
                      disabled={!investmentAmount || parseFloat(investmentAmount) < 1}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      Buy ${investmentAmount || '0'} of {selectedStock.symbol}
                    </button>
                    
                    <p className="text-xs text-gray-500 mt-3 text-center">
                      Own a piece of {selectedStock.name} starting today
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentView === 'portfolio' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Portfolio</h2>
            <p className="text-gray-600">Track your fractional stock investments</p>
          </div>

          {portfolio.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">📈</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Start Building Your Portfolio</h3>
              <p className="text-gray-600 mb-6">Invest in your first stock to get started</p>
              <button
                onClick={() => setCurrentView('dashboard')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
              >
                Browse Stocks
              </button>
            </div>
          ) : (
            <>
              {/* Portfolio Summary */}
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Total Value</h3>
                  <p className="text-3xl font-bold text-gray-900">${calculatePortfolioValue().toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Total Gain/Loss</h3>
                  <p className={`text-3xl font-bold ${calculatePortfolioGain() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {calculatePortfolioGain() >= 0 ? '+' : ''}${calculatePortfolioGain().toFixed(2)}
                  </p>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Holdings</h3>
                  <p className="text-3xl font-bold text-gray-900">{portfolio.length}</p>
                </div>
              </div>

              {/* Holdings List */}
              <div className="space-y-4">
                {portfolio.map((holding, index) => {
                  const currentStock = mockStocks.find(s => s.symbol === holding.stock_symbol);
                  if (!currentStock) return null;
                  
                  const currentValue = holding.shares * currentStock.price;
                  const gain = currentValue - holding.invested_amount;
                  const gainPercent = (gain / holding.invested_amount) * 100;

                  return (
                    <div key={index} className="bg-white rounded-xl shadow-lg p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${currentStock.color} flex items-center justify-center`}>
                            <span className="text-xl">{currentStock.logo}</span>
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-gray-900">{currentStock.symbol}</h3>
                            <p className="text-sm text-gray-600">{holding.shares.toFixed(6)} shares</p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="font-bold text-xl text-gray-900">${currentValue.toFixed(2)}</p>
                          <p className={`text-sm ${gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {gain >= 0 ? '+' : ''}${gain.toFixed(2)} ({gainPercent.toFixed(2)}%)
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Invested: </span>
                            <span className="font-medium">${holding.invested_amount.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Current Price: </span>
                            <span className="font-medium">${currentStock.price.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default App;