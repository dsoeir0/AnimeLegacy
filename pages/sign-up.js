import AuthPage from '../components/auth/AuthPage';

export default function SignUpPage() {
  return (
    <AuthPage
      title="Sign up"
      subtitle="Create your AnimeLegacy profile and start building your list."
      altHref="/sign-in"
      altLabel="Go to Sign in"
      mode="signup"
    />
  );
}
