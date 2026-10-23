export default function PageTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="mb-8 text-center text-2xl font-bold tracking-tight text-balance break-words">
      {children}
    </h1>
  );
}
