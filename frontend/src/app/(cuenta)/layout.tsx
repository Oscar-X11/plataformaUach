import AuthLayout from "../(auth)/layout";

/** Pantallas de cuenta con sesión iniciada, con el mismo marco que el login. */
export default function CuentaLayout({ children }: { children: React.ReactNode }) {
  return <AuthLayout>{children}</AuthLayout>;
}
