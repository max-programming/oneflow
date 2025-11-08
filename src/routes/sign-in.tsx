import {
  createFileRoute,
  Link,
  redirect,
  useRouter,
} from "@tanstack/react-router";
import { useState } from "react";
import { signInFn } from "@/server/auth";
import { Button } from "@/components/ui/button";
import { Particles } from "@/components/ui/particles";
import { ChevronLeftIcon, AtSignIcon, LockIcon } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { useQueryClient } from "@tanstack/react-query";

import authCss from "../auth.css?url";

export const Route = createFileRoute("/sign-in")({
  beforeLoad: async ({ context }) => {
    if (context.session) {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    links: [
      {
        rel: "stylesheet",
        href: authCss,
      },
    ],
  }),
  component: SignIn,
});

function SignIn() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInFn({ data: { email, password } });
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      router.navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative w-full md:h-screen md:overflow-hidden dark">
      <Particles
        className="absolute inset-0"
        color="#666666"
        ease={20}
        quantity={120}
      />
      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-4">
        <Button asChild className="absolute top-4 left-4" variant="ghost">
          <Link to="/">
            <ChevronLeftIcon />
            Home
          </Link>
        </Button>

        <div className="mx-auto space-y-4 sm:w-sm">
          {/* <Logo className="h-6" /> */}
          <div className="flex flex-col space-y-1">
            <h1 className="font-bold text-2xl tracking-wide">Welcome Back!</h1>
            <p className="text-base text-muted-foreground">
              Sign in to your account to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <InputGroup>
                <InputGroupInput
                  placeholder="your.email@example.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
                <InputGroupAddon>
                  <AtSignIcon />
                </InputGroupAddon>
              </InputGroup>

              <InputGroup>
                <InputGroupInput
                  placeholder="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <InputGroupAddon>
                  <LockIcon />
                </InputGroupAddon>
              </InputGroup>
            </div>

            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Signing In..." : "Sign In"}
            </Button>
          </form>

          <div className="space-y-4">
            <p className="text-center text-muted-foreground text-sm">
              Don't have an account?{" "}
              <Link
                className="underline underline-offset-4 hover:text-primary font-medium"
                to="/sign-up"
              >
                Sign up
              </Link>
            </p>
            <p className="text-muted-foreground text-sm">
              By clicking continue, you agree to our{" "}
              <a
                className="underline underline-offset-4 hover:text-primary"
                href="#"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                className="underline underline-offset-4 hover:text-primary"
                href="#"
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
