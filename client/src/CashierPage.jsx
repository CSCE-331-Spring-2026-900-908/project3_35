import StaffAccessPage from './components/StaffAccessPage';

export default function CashierPage() {
  return (
    <StaffAccessPage
      requiredRole="employee"
      title="Cashier Interface"
      description="Staff must sign in before accessing the counter-facing POS experience."
    />
  );
}
