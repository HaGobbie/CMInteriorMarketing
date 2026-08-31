import { Route, Router, Switch } from 'wouter';
import Home from '@/pages/home';
import StaffPage from '@/pages/staff';

function NotFound() {
  return (
    <main style={{ padding: 32 }}>
      <h1>Page not found</h1>
      <a href={`${import.meta.env.BASE_URL}`}>Return home</a>
    </main>
  );
}

export default function App() {
  return (
    <Router base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/staff" component={StaffPage} />
        <Route component={NotFound} />
      </Switch>
    </Router>
  );
}