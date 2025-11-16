import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { UserButton } from '@clerk/nextjs';

const MenuOption = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Upgrade', path: '/upgrade' },
  { name: 'How it works?', path: '/how-it-works' }
];

function AppHeader({ logo = "/logo.svg" }) {
  return (
    <nav className="flex w-full items-center justify-between border-t border-b border-neutral-200 px-4 py-4 dark:border-neutral-800">
      <div className="flex items-center gap-2">
        <Image src={logo} alt="logo" height={40} width={40} />
        <h1 className="text-base font-bold md:text-2xl">AI MOCK INTERVIEW</h1>
      </div>
      <div>
        <ul className="flex gap-5">
          {MenuOption.map((option) => (
            <li key={option.name} className='text-lg hover:scale-105 transition-all'>
              <Link href={option.path}>{option.name}</Link>
            </li>
          ))}
        </ul>
      </div>
      <UserButton />
    </nav>
  );
}

export default AppHeader;
