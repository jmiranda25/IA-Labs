import { UserProfile } from "@clerk/react";
import { Layout } from "@/components/layout";
import { Helmet } from "react-helmet-async";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function CuentaPage() {
  return (
    <Layout>
      <Helmet>
        <title>Mi Cuenta — IA Labs</title>
      </Helmet>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <UserProfile
          routing="path"
          path={`${basePath}/cuenta`}
          appearance={{
            elements: {
              rootBox: "w-full",
              cardBox: "w-full max-w-full shadow-none border border-border rounded-2xl overflow-hidden",
              card: "!shadow-none !border-0 !bg-card !rounded-none",
              navbar: "!bg-card !border-r !border-border",
              navbarMobileMenuRow: "!bg-card !border-b !border-border",
              pageScrollBox: "!bg-card",
              page: "!bg-card",
            },
          }}
        />
      </div>
    </Layout>
  );
}
