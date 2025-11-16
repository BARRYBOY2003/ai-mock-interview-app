import React from 'react'
import AppHeader from './_components/AppHeader'
import { UserDetailProvider } from '@/context/UserDetailContext'

function DashboardLayout({children}:any) {
  return (
   


    <div>
        <AppHeader/>
      {children}
    </div>
    
  )
}

export default DashboardLayout
