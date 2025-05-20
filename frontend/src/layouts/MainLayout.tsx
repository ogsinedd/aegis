import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package2, 
  ShieldAlert, 
  Calendar, 
  Code, 
  RefreshCw,
  Menu, 
  X,
  Shield
} from 'lucide-react';

const MainLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState("Панель управления");
  const location = useLocation();

  useEffect(() => {
    // Определяем текущую страницу на основе URL
    const path = location.pathname;
    if (path === "/" || path === "") {
      setCurrentPage("Панель управления");
    } else if (path.includes("/containers")) {
      setCurrentPage("Контейнеры");
    } else if (path.includes("/vulnerabilities")) {
      setCurrentPage("Уязвимости");
    } else if (path.includes("/plan")) {
      setCurrentPage("План");
    } else if (path.includes("/hooks")) {
      setCurrentPage("Хуки");
    }
  }, [location]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Боковая панель */}
      <aside 
        className={`bg-background border-r border-border fixed inset-y-0 left-0 z-20 ${
          isSidebarCollapsed ? 'w-[70px]' : 'w-[250px]'
        } transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 md:static transition-all duration-300 ease-in-out flex flex-col`}
      >
        <div className="h-16 flex items-center px-4 border-b border-border">
          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center w-full' : ''}`}>
            <img src="/aegis-logo.png" alt="AEGIS" className="h-14 w-14" />
            {!isSidebarCollapsed && (
              <span className="ml-2 font-bold text-xl font-aegis tracking-wider text-white">AEGIS</span>
            )}
          </div>
        </div>
        
        <nav className="flex-1 px-2 py-4 space-y-2 overflow-y-auto scrollbar-hide">
          <NavLink 
            to="/" 
            end
            className={({ isActive }) => 
              `flex items-center px-3 py-2 rounded-md transition-colors ${
                isSidebarCollapsed ? 'justify-center' : ''
              } ${isActive 
                ? 'bg-secondary text-primary' 
                : 'text-foreground hover:bg-secondary/50 hover:text-primary'}`
            }
          >
            <LayoutDashboard className={`h-5 w-5 ${!isSidebarCollapsed && 'mr-3'}`} />
            {!isSidebarCollapsed && <span>Панель управления</span>}
          </NavLink>

          <NavLink 
            to="/containers" 
            className={({ isActive }) => 
              `flex items-center px-3 py-2 rounded-md transition-colors ${
                isSidebarCollapsed ? 'justify-center' : ''
              } ${isActive 
                ? 'bg-secondary text-primary' 
                : 'text-foreground hover:bg-secondary/50 hover:text-primary'}`
            }
          >
            <Package2 className={`h-5 w-5 ${!isSidebarCollapsed && 'mr-3'}`} />
            {!isSidebarCollapsed && <span>Контейнеры</span>}
          </NavLink>

          <NavLink 
            to="/vulnerabilities" 
            className={({ isActive }) => 
              `flex items-center px-3 py-2 rounded-md transition-colors ${
                isSidebarCollapsed ? 'justify-center' : ''
              } ${isActive 
                ? 'bg-secondary text-primary' 
                : 'text-foreground hover:bg-secondary/50 hover:text-primary'}`
            }
          >
            <ShieldAlert className={`h-5 w-5 ${!isSidebarCollapsed && 'mr-3'}`} />
            {!isSidebarCollapsed && <span>Уязвимости</span>}
          </NavLink>

          <NavLink 
            to="/plan" 
            className={({ isActive }) => 
              `flex items-center px-3 py-2 rounded-md transition-colors ${
                isSidebarCollapsed ? 'justify-center' : ''
              } ${isActive 
                ? 'bg-secondary text-primary' 
                : 'text-foreground hover:bg-secondary/50 hover:text-primary'}`
            }
          >
            <Calendar className={`h-5 w-5 ${!isSidebarCollapsed && 'mr-3'}`} />
            {!isSidebarCollapsed && <span>План</span>}
          </NavLink>

          <NavLink 
            to="/hooks" 
            className={({ isActive }) => 
              `flex items-center px-3 py-2 rounded-md transition-colors ${
                isSidebarCollapsed ? 'justify-center' : ''
              } ${isActive 
                ? 'bg-secondary text-primary' 
                : 'text-foreground hover:bg-secondary/50 hover:text-primary'}`
            }
          >
            <Code className={`h-5 w-5 ${!isSidebarCollapsed && 'mr-3'}`} />
            {!isSidebarCollapsed && <span>Хуки</span>}
          </NavLink>
        </nav>

        <div className="p-2 border-t border-border">
          <button 
            onClick={toggleSidebarCollapse}
            className="w-full p-2 flex items-center justify-center rounded-md hover:bg-secondary/50 text-foreground"
          >
            {isSidebarCollapsed ? (
              <Menu size={20} />
            ) : (
              <X size={20} />
            )}
          </button>
        </div>
      </aside>

      {/* Основной контент */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 shrink-0 border-b border-border flex items-center justify-between px-4 md:px-6">
          <button 
            className="md:hidden text-foreground"
            onClick={toggleSidebar}
          >
            <Menu size={24} />
          </button>
          
          <div className="md:flex-1">
            <h1 className="text-2xl font-aegis tracking-wider font-bold text-white">{currentPage}</h1>
          </div>

          <button className="btn btn-secondary">
            <RefreshCw size={16} className="mr-2" />
Обновить
          </button>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </div>
      </main>

      {/* Затемненный фон при открытом боковом меню на мобильных устройствах */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-10 md:hidden"
          onClick={toggleSidebar}
        />
      )}
    </div>
  );
};

export default MainLayout; 
