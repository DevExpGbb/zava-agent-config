export default function DashboardPage({ params }: { params: { id: string } }) {
  const id = params.id;
  return <div>Dashboard {id}</div>;
}
