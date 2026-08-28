import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const candidate = typeof searchParams.redirectTo === 'string' ? searchParams.redirectTo : '/dashboard';
  const redirectTo = candidate.startsWith('/') && !candidate.startsWith('//') ? candidate : '/dashboard';

  return <LoginForm redirectTo={redirectTo} configurationError={searchParams.error === 'configuration'} />;
}
