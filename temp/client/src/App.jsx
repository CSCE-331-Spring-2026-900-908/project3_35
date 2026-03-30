import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PortalPage from './PortalPage';
import CustomerPage from './CustomerPage';
import CashierPage from './CashierPage';
import ManagerPage from './ManagerPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PortalPage />} />
        <Route path="/customer" element={<CustomerPage />} />
        <Route path="/cashier" element={<CashierPage />} />
        <Route path="/manager" element={<ManagerPage />} />
      </Routes>
    </BrowserRouter>
  );
}