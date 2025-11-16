"use client"
import AppHeader from '@/app/(routes)/_components/AppHeader'
import React from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button';
import { useParams } from 'next/navigation';
import Link from 'next/link';


const Interview = () => {
  const {id}=useParams();
  return (
    <div>
      <AppHeader logo='/logo.svg'/>
    <div className='flex flex-col items-center justify-center min-h-screen bg-gray-50'>
      
      <div className='bg-white shadow-lg rounded-lg p-8 flex flex-col items-center'>
      <Image
  src='/Interview1.jpg'
  alt='interview'
  width={400}
  height={200}
  className='w-full h-[200px] object-contain rounded-md mb-6'
/>

        <h2 className='font-bold text-3xl text-center mb-4'>Ready</h2>
        <p className='text-gray-600 text-center mb-6'>
          The interview will last 30 minutes. Are you ready?
        </p>
        <Link href={`/interview/${id}/start`}>
        <Button className="px-6 py-2 rounded-full font-medium">
          Start Interview
        </Button>
        </Link>
      </div>
    </div>
    
    </div>
  )
}

export default Interview
