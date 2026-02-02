'use client';

import { LuBell as Bell, LuUser as User, LuCalendar as Calendar, LuClock as Clock } from 'react-icons/lu';
import { SidebarTrigger } from '@/components/ui/sidebar';

const Header = () => {
  const currentDate = new Date();
  const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'short' });
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long' });
  const day = currentDate.getDate();
  const ordinal = day === 1 || day === 21 || day === 31 ? 'st' : 
                  day === 2 || day === 22 ? 'nd' : 
                  day === 3 || day === 23 ? 'rd' : 'th';

  return (
    <header className="relative bg-gradient-to-r from-white via-blue-50/30 to-purple-50/30 border-b border-gray-200/50 px-2 sm:px-4 lg:px-6 py-2 sm:py-4 backdrop-blur-sm">

      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4">
          <SidebarTrigger className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200" />
          {/* <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-1 h-6 sm:h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
            <h2 className="text-sm sm:text-lg lg:text-xl font-bold bg-gradient-to-r from-gray-800 via-blue-600 to-purple-600 bg-clip-text text-transparent">
              <span className="hidden sm:inline">EduHub Learning Platform</span>
              <span className="sm:hidden">EduHub</span>
            </h2>
          </div> */}
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
          {/* Date Section with Geometric Design - Hidden on mobile */}
          <div className="hidden sm:flex items-center gap-2 lg:gap-3 px-2 lg:px-4 py-1 lg:py-2 rounded-xl bg-gradient-to-r from-gray-50/80 to-blue-50/50 border border-gray-200/50 backdrop-blur-sm">
            <Calendar className="w-3 h-3 lg:w-4 lg:h-4 text-blue-500" />
            <div className="text-xs lg:text-sm font-medium text-gray-700">
              <span className="hidden lg:inline">{dayName} // {monthName} {day}{ordinal}, {currentDate.getFullYear()}</span>
              <span className="lg:hidden">{dayName} {day}{ordinal}</span>
            </div>
            <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>
          
          {/* Time Section - Hidden on mobile */}
          <div className="hidden sm:flex items-center gap-1 lg:gap-2 px-2 lg:px-3 py-1 lg:py-2 rounded-lg bg-gradient-to-r from-purple-50/80 to-indigo-50/50 border border-purple-200/50">
            <Clock className="w-3 h-3 lg:w-4 lg:h-4 text-purple-500" />
            <div className="text-xs lg:text-sm font-medium text-gray-700">
              {currentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          
          {/* Notification Button */}
          <button className="relative p-2 lg:p-3 text-gray-600 hover:text-blue-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 rounded-xl transition-all duration-200 group">
            <Bell size={16} className="sm:w-5 sm:h-5" />
            <div className="absolute -top-0.5 -right-0.5 lg:-top-1 lg:-right-1 w-2 h-2 lg:w-3 lg:h-3 bg-gradient-to-r from-red-400 to-pink-500 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-100/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
          </button>
          
          {/* User Button */}
          <button className="relative p-2 lg:p-3 text-gray-600 hover:text-purple-600 hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 rounded-xl transition-all duration-200 group">
            <User size={16} className="sm:w-5 sm:h-5" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-100/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
