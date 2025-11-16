import { Button } from '@/components/ui/button';
import Image from 'next/image';
import React from 'react';
import CreateInterviewDialog from '../_components/CreateInterviewDialog';

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center mt-32">
      <div className="border-2 border-dashed border-gray-500 rounded-lg p-10 flex flex-col items-center bg-white shadow-md w-[1200px]">
        <Image
          src="/interview.jpg"
          alt="emptyState"
          width={340}
          height={340}
          className="mx-auto"
        />
        <h2 className="mt-6 text-xl font-semibold text-gray-600 text-center">
          You don't have any interview created
        </h2>
        <CreateInterviewDialog/>
      </div>
    </div>
  );
}

export default EmptyState;
