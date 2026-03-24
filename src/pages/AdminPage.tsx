import React, { useState, useEffect } from 'react';
import { Shield, Users, Activity, TrendingUp, Eye, Trash2, Search } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';

interface ActivityLog {
  id: number;
  action: string;
  details: string;
  timestamp: string;
  user: string;
}

const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    const savedActivities = JSON.parse(localStorage.getItem('windcast_activities') || '[]');
    // Filter activities to show only current user's activities
    const userActivities = savedActivities.filter((activity: ActivityLog) => 
      activity.user === user?.name
    );
    setActivities(userActivities);
  }, [user?.name]);

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.details.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || activity.action.toLowerCase().includes(filterType.toLowerCase());
    
    return matchesSearch && matchesFilter;
  });

  const clearMyActivities = () => {
    if (confirm('Are you sure you want to clear all your activity logs?')) {
      // Get all activities and remove only current user's activities
      const allActivities = JSON.parse(localStorage.getItem('windcast_activities') || '[]');
      const otherUsersActivities = allActivities.filter((activity: ActivityLog) => 
        activity.user !== user?.name
      );
      localStorage.setItem('windcast_activities', JSON.stringify(otherUsersActivities));
      setActivities([]);
    }
  };

  const deleteActivity = (id: number) => {
    // Remove from local state
    const updatedActivities = activities.filter(activity => activity.id !== id);
    setActivities(updatedActivities);
    
    // Update localStorage by removing this specific activity
    const allActivities = JSON.parse(localStorage.getItem('windcast_activities') || '[]');
    const updatedAllActivities = allActivities.filter((activity: ActivityLog) => activity.id !== id);
    localStorage.setItem('windcast_activities', JSON.stringify(updatedAllActivities));
  };

  const getStats = () => {
    const today = new Date().toDateString();
    const todayActivities = activities.filter(activity => 
      new Date(activity.timestamp).toDateString() === today
    );
    
    const totalPredictions = activities.filter(activity => 
      activity.action.includes('Prediction')
    ).length;

    const loginCount = activities.filter(activity => 
      activity.action.includes('Login')
    ).length;
    
    return {
      totalActivities: activities.length,
      todayActivities: todayActivities.length,
      totalPredictions,
      loginCount
    };
  };

  const stats = getStats();

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <Shield className="h-8 w-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">My Activity Dashboard</h1>
          </div>
          <p className="text-gray-600">
            Monitor your personal activities and interactions with the WindCast Pro platform.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center space-x-3">
              <Activity className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">My Total Activities</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalActivities}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Today's Activities</p>
                <p className="text-2xl font-bold text-green-600">{stats.todayActivities}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center space-x-3">
              <Eye className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Predictions Made</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalPredictions}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center space-x-3">
              <Users className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Login Sessions</p>
                <p className="text-2xl font-bold text-orange-600">{stats.loginCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Logs */}
        <div className="bg-white rounded-xl shadow-lg">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <h2 className="text-xl font-semibold text-gray-900">My Activity History</h2>
              <div className="flex space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search my activities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                >
                  <option value="all">All Activities</option>
                  <option value="login">Logins</option>
                  <option value="registration">Registrations</option>
                  <option value="prediction">Predictions</option>
                  <option value="logout">Logouts</option>
                </select>
                <button
                  onClick={clearMyActivities}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center space-x-1"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Clear My History</span>
                </button>
              </div>
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {filteredActivities.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No activities found matching your criteria.</p>
                <p className="text-sm mt-2">Start using the platform to see your activity history here.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredActivities.map((activity) => (
                  <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            activity.action.includes('Login') ? 'bg-green-500' :
                            activity.action.includes('Registration') ? 'bg-blue-500' :
                            activity.action.includes('Prediction') ? 'bg-purple-500' :
                            activity.action.includes('Logout') ? 'bg-red-500' :
                            'bg-gray-500'
                          }`}></div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">{activity.action}</h3>
                            <p className="text-sm text-gray-600">{activity.details}</p>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-xs text-gray-500">
                                {new Date(activity.timestamp).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteActivity(activity.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Delete this activity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;