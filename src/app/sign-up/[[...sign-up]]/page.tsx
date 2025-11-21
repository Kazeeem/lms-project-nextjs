import { SignUp } from "@clerk/nextjs";

const SignUpPage = async ({searchParams}: {searchParams: {redirect_url?: string}}) => {
  const params = await searchParams;
  const redirectUrl = params.redirect_url || '/dashboard';

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-gray-50 to-gray-100">
      <SignUp 
        appearance={{
          elements: {
            formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-sm normal-case",
            card: "shadow-xl"
          }
        }}
        signInUrl="/sign-in"
        afterSignInUrl={redirectUrl}
        redirectUrl={redirectUrl}
      />
    </div>
  )
}
export default SignUpPage