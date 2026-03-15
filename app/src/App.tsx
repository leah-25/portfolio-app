import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import Shell from './components/layout/Shell';
import Dashboard from './features/dashboard/Dashboard';
import Holdings from './features/holdings/Holdings';
import Thesis from './features/thesis/Thesis';
import Notes from './features/notes/Notes';
import Rebalance from './features/rebalance/Rebalance';
import Risk from './features/risk/Risk';
import Settings from './features/settings/Settings';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true,         element: <Dashboard /> },
      { path: 'holdings',   element: <Holdings /> },
      { path: 'thesis',     element: <Thesis /> },
      { path: 'notes',      element: <Notes /> },
      { path: 'rebalance',  element: <Rebalance /> },
      { path: 'risk',       element: <Risk /> },
      { path: 'settings',   element: <Settings /> },
      { path: '*',          element: <Navigate to="/" replace /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
