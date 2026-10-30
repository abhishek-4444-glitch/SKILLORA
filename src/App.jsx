import Sidebar from './components/Sidebar.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { useRoute } from './router.js';
import Landing from './pages/Landing.jsx';
import Profile from './pages/Profile.jsx';
import Dashboard from './pages/Dashboard.jsx';
import SimulatorPage from './pages/SimulatorPage.jsx';
import Risks from './pages/Risks.jsx';
import Careers from './pages/Careers.jsx';
import HowItWorks from './pages/HowItWorks.jsx';
import DataTests from './pages/DataTests.jsx';
import Upload from './pages/Upload.jsx';
import Suitability from './pages/Suitability.jsx';
import Report from './pages/Report.jsx';

const PAGES = {
  upload: Upload,
  suitability: Suitability,
  profile: Profile,
  dashboard: Dashboard,
  simulator: SimulatorPage,
  risks: Risks,
  careers: Careers,
  report: Report,
  'how-it-works': HowItWorks,
  data: DataTests,
};

export default function App() {
  const route = useRoute();
  if (route === '') return <Landing />;
  const Page = PAGES[route];
  return (
    <div className="min-h-screen bg-surface">
      <Sidebar route={route} />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          <ErrorBoundary key={route}>
            <Page />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
