import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { NavHeader } from './components/shared/NavHeader';
import { HomePage } from './pages/HomePage';
import { DemosPage } from './pages/DemosPage';
import { SessionPage } from './pages/SessionPage';
import { ExternalPage } from './pages/ExternalPage';

export default function App() {
  const location = useLocation();

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <NavHeader />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<HomePage />} />
          <Route path="/demos" element={<DemosPage />} />
          <Route path="/session/:id" element={<SessionPage />} />
          <Route path="/external" element={<ExternalPage />} />
        </Routes>
      </AnimatePresence>
    </div>
  );
}
