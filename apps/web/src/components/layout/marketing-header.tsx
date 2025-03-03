"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";

import { Button } from "@openstatus/ui";

import { cn } from "@/lib/utils";
import { BrandName } from "./brand-name";

interface Props {
  className?: string;
}

export function MarketingHeader({ className }: Props) {
  const { isSignedIn } = useUser();

  return (
    <header
      className={cn(
        "flex w-full items-center justify-between gap-2",
        className,
      )}
    >
      <BrandName />
      <div className="flex items-center md:gap-3">
        <Button variant="link" asChild className="md:mr-3">
          <Link href="/blog">Blog</Link>
        </Button>
        <Button asChild className="rounded-full">
          {isSignedIn ? (
            <Link href="/app">Dashboard</Link>
          ) : (
            <Link href="/app/sign-up">Sign Up</Link>
          )}
        </Button>
      </div>
    </header>
  );
}
