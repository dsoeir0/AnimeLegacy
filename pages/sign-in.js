import AuthPage from '../components/auth/AuthPage';

export default function SignInPage() {
  return (
    <AuthPage
      title="Sign in"
      subtitle="Create your AnimeLegacy profile and start building your list."
      altHref="/login"
      altLabel="Go to Login"
      mode="signup"
    />
  );
}
