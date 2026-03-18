import AuthPage from '../components/auth/AuthPage';

export default function SignInPage() {
  return (
    <AuthPage
      title="Sign in"
      subtitle="Pick up right where you left off and keep your personal watchlist synced."
      altHref="/sign-up"
      altLabel="Go to Sign up"
      mode="login"
    />
  );
}
