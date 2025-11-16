"use client";
import React, { createContext, useEffect, useState } from 'react';
import { api } from '@/convex/_generated/api';
import { useMutation } from 'convex/react';
import { useUser } from '@clerk/nextjs';
import { CreateNewUser } from '@/convex/users';
import { UserDetailContext } from '@/context/UserDetailContext';

function Provider({ children }: any) {
  const { user } = useUser();
  const CreateUser = useMutation(api.users.CreateNewUser);
  const [UserDetail,setUserDetail]=useState<any>();

  useEffect(() => { user&&CreateNewUser();},[user])
    const CreateNewUser=async ()=>{
    if (user) {
        const result=await CreateUser({
        email: user.primaryEmailAddress?.emailAddress ?? '',
        imageUrl: user.imageUrl ?? '',
        name: user.fullName ?? ''
      });

        console.log(result);
        setUserDetail(result);
      }
    }

  return (<UserDetailContext.Provider value={{UserDetail,setUserDetail}}><div>{children}</div></UserDetailContext.Provider>);
}

export default Provider;
export const useUserDetailContext=()=>{
    return (createContext(UserDetailContext));
}
