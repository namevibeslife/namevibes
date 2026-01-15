import React from 'react';
import { Filter } from 'lucide-react';

/**
 * FilterPanel Component - Reusable filter UI for all admin tabs
 * 
 * @param {string} filterType - Type of filters to show: 'users', 'ambassadors', 'payments', 'payouts'
 * @param {object} filters - Current filter values
 * @param {function} onFilterChange - Callback when filters change
 * @param {object} COUNTRIES - Countries data object
 * @param {function} getAvailableStates - Function to get states for a country
 * @param {array} months - Array of month names
 * @param {array} years - Array of years
 */
export default function FilterPanel({
  filterType,
  filters,
  onFilterChange,
  COUNTRIES,
  getAvailableStates,
  months,
  years
}) {
  
  const handleFilterUpdate = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    
    // If country changes, reset state
    if (key === 'country') {
      newFilters.state = 'all';
    }
    
    onFilterChange(newFilters);
  };

  // Determine which filters to show based on filterType
  const showGateway = filterType === 'payments';
  const showCountry = ['users', 'ambassadors', 'payments', 'payouts'].includes(filterType);
  const showState = ['users', 'ambassadors', 'payments', 'payouts'].includes(filterType);
  const showMonth = ['users', 'ambassadors', 'payments', 'payouts'].includes(filterType);
  const showYear = ['users', 'ambassadors', 'payments', 'payouts'].includes(filterType);
  const showPlanType = filterType === 'users';
  const showStatus = filterType === 'ambassadors';

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-purple-600" />
        <h3 className="text-lg font-bold text-gray-800">Filters</h3>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gateway Filter (Payments only) */}
        {showGateway && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Gateway
            </label>
            <select
              value={filters.gateway || 'all'}
              onChange={(e) => handleFilterUpdate('gateway', e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              <option value="all">All Gateways</option>
              <option value="razorpay">Razorpay</option>
              <option value="paypal">PayPal</option>
            </select>
          </div>
        )}

        {/* Country Filter */}
        {showCountry && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country
            </label>
            <select
              value={filters.country || 'all'}
              onChange={(e) => handleFilterUpdate('country', e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              <option value="all">All Countries</option>
              {Object.values(COUNTRIES).map(country => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* State Filter */}
        {showState && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              State
            </label>
            <select
              value={filters.state || 'all'}
              onChange={(e) => handleFilterUpdate('state', e.target.value)}
              disabled={!filters.country || filters.country === 'all'}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="all">All States</option>
              {filters.country && filters.country !== 'all' && 
                getAvailableStates(filters.country).map(state => (
                  <option key={state.code} value={state.code}>
                    {state.name}
                  </option>
                ))
              }
            </select>
          </div>
        )}

        {/* Month Filter */}
        {showMonth && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Month
            </label>
            <select
              value={filters.month || 'all'}
              onChange={(e) => handleFilterUpdate('month', e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              <option value="all">All Months</option>
              {months.map((month, idx) => (
                <option key={idx} value={idx + 1}>
                  {month}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Year Filter */}
        {showYear && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Year
            </label>
            <select
              value={filters.year || 'all'}
              onChange={(e) => handleFilterUpdate('year', e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              <option value="all">All Years</option>
              {years.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Plan Type Filter (Users only) */}
        {showPlanType && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plan Type
            </label>
            <select
              value={filters.planType || 'all'}
              onChange={(e) => handleFilterUpdate('planType', e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              <option value="all">All Plans</option>
              <option value="none">No Plan</option>
              <option value="individual">Individual</option>
              <option value="family">Family</option>
            </select>
          </div>
        )}

        {/* Status Filter (Ambassadors only) */}
        {showStatus && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filters.status || 'all'}
              onChange={(e) => handleFilterUpdate('status', e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        )}
      </div>

      {/* Active Filters Summary */}
      {Object.keys(filters).some(key => filters[key] !== 'all' && filters[key] !== undefined) && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-600">Active Filters:</span>
            
            {filters.gateway && filters.gateway !== 'all' && (
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                Gateway: {filters.gateway}
              </span>
            )}
            
            {filters.country && filters.country !== 'all' && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                Country: {COUNTRIES[filters.country]?.name}
              </span>
            )}
            
            {filters.state && filters.state !== 'all' && (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                State: {filters.state}
              </span>
            )}
            
            {filters.month && filters.month !== 'all' && (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                Month: {months[parseInt(filters.month) - 1]}
              </span>
            )}
            
            {filters.year && filters.year !== 'all' && (
              <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-xs font-semibold">
                Year: {filters.year}
              </span>
            )}
            
            {filters.planType && filters.planType !== 'all' && (
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold capitalize">
                Plan: {filters.planType}
              </span>
            )}
            
            {filters.status && filters.status !== 'all' && (
              <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold capitalize">
                Status: {filters.status}
              </span>
            )}
            
            <button
              onClick={() => onFilterChange({
                country: 'all',
                state: 'all',
                month: 'all',
                year: 'all',
                gateway: 'all',
                planType: 'all',
                status: 'all'
              })}
              className="ml-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold hover:bg-red-200 transition"
            >
              Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
