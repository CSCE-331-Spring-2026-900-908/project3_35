import StaffAccessPage from './components/StaffAccessPage';

export default function ManagerPage() {
  return (
    <StaffAccessPage
      requiredRole="manager"
      title="Manager Dashboard"
      description="Managers must sign in before accessing reporting, inventory, and administration tools."
    />
  );
}
