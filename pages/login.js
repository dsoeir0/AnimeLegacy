import AuthPage from '../components/auth/AuthPage';

export default function LoginPage() {
  return (
    <AuthPage
      title="Login"
      subtitle="Pick up right where you left off and keep your personal watchlist synced."
      altHref="/sign-in"
      altLabel="Go to Sign in"
      mode="login"
    />
  );
}
