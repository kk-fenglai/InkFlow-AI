/** Shared authenticated user shape for web session and mobile JWT. */
export type SessionUser = {
  id: string;
  email: string | null;
  name: string | null;
  credits: number;
  plan: string;
  role: string;
};

export function sessionUserFromDb(user: {
  id: string;
  email: string;
  name: string | null;
  credits: number;
  plan: string;
  role: string;
}): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    credits: user.credits,
    plan: user.plan,
    role: user.role,
  };
}
