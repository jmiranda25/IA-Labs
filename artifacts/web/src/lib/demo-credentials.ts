export const DEMO_PASSWORD = "Demo2026!";

export interface DemoAccount {
  label: string;
  role: string;
  email: string;
  displayName: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: "Lucía (Admin)",
    role: "Administradora",
    email: "lucia.mendez@aicomunidad.dev",
    displayName: "Lucía Méndez",
  },
  {
    label: "Carlos (Participante)",
    role: "Participante",
    email: "carlos.reyes@aicomunidad.dev",
    displayName: "Carlos Reyes",
  },
];
