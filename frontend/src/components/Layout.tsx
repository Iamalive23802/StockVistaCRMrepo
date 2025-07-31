import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import ToastContainer from './ToastContainer';

function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-900 text-white">
      {/* Fixed Sidebar */}
      <div className="flex-shrink-0 w-64 h-full">
        <Sidebar />
      </div>

      {/* Scrollable Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
      <ToastContainer />
    </div>
  );
}

export default Layout;
