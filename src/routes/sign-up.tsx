import {
  createFileRoute,
  Link,
  redirect,
  useRouter,
} from "@tanstack/react-router";
import { useState } from "react";
import { signUpFn } from "@/server/auth";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, UserIcon, AtSignIcon, LockIcon } from "lucide-react";
import { FloatingPaths } from "@/components/auth/floating-paths";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { useQueryClient } from "@tanstack/react-query";

import authCss from "../auth.css?url";

export const Route = createFileRoute("/sign-up")({
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
  component: SignUp,
});

function SignUp() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signUpFn({ data: { name, email, username, password } });
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      router.navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign up");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative md:h-screen md:overflow-hidden lg:grid lg:grid-cols-2 dark">
      <div className="relative hidden h-full flex-col border-r bg-secondary p-10 lg:flex dark:bg-secondary/20">
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-background" />
        {/* <Logo className="mr-auto h-5" /> */}

        <div className="z-10 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-xl">
              &ldquo;Some amazing review we are going to put over here&rdquo;
            </p>
            <footer className="font-mono font-semibold text-sm">
              ~ John Doe
            </footer>
          </blockquote>
        </div>
        <div className="absolute inset-0">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>
      </div>
      <div className="relative flex min-h-screen flex-col justify-center p-4">
        <div
          aria-hidden
          className="-z-10 absolute inset-0 isolate opacity-60 contain-strict"
        >
          <div className="-translate-y-87.5 absolute top-0 right-0 h-320 w-140 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,--theme(--color-foreground/.06)_0,hsla(0,0%,55%,.02)_50%,--theme(--color-foreground/.01)_80%)]" />
          <div className="absolute top-0 right-0 h-320 w-60 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)] [translate:5%_-50%]" />
          <div className="-translate-y-87.5 absolute top-0 right-0 h-320 w-60 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)]" />
        </div>
        <Button asChild className="absolute top-7 left-5" variant="ghost">
          <Link to="/">
            <ChevronLeftIcon />
            Home
          </Link>
        </Button>
        <div className="mx-auto space-y-4 sm:w-sm">
          {/* <Logo className="h-5 lg:hidden" /> */}
          <div className="flex flex-col space-y-1">
            <h1 className="font-bold text-2xl tracking-wide">
              Create Your Account
            </h1>
            <p className="text-base text-muted-foreground">
              Sign up to get started with your account.
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
                  placeholder="Full Name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                />
                <InputGroupAddon>
                  <UserIcon />
                </InputGroupAddon>
              </InputGroup>

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
                  placeholder="Username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={loading}
                />
                <InputGroupAddon>
                  <UserIcon />
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
                  minLength={6}
                />
                <InputGroupAddon>
                  <LockIcon />
                </InputGroupAddon>
              </InputGroup>
            </div>

            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>
          <div className="space-y-4">
            <p className="text-center text-muted-foreground text-sm">
              Already have an account?{" "}
              <Link
                to="/sign-in"
                className="underline underline-offset-4 hover:text-primary font-medium"
              >
                Sign in
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
    </main>
  );
}
