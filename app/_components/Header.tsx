import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import React from "react";

function Header() {
  return (
    <nav className="flex w-full items-center justify-between border-t border-b border-neutral-200 px-4 py-4 dark:border-neutral-800">
      <div className="flex items-center gap-2">
        <Image src="logo.svg" alt="logo" height={40} width={40} />
        <h1 className="text-base font-bold md:text-2xl">AI MOCK INTERVIEW</h1>
      </div>
      <Link href="/dashboard">
        <Button>
          Get Started
        </Button>
      </Link>
    </nav>
  );
}

export default Header;
