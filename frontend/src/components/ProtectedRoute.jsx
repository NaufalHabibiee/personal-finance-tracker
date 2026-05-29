import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="spinner-page"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}
