"use client";

import { createContext, useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";

export const UserDetailContext = createContext<any>(null);

export const UserDetailProvider = ({ children }: any) => {
  const { user } = useUser();
  const [userDetail, setUserDetail] = useState<any>(null);

  useEffect(() => {
    if (user) {
      setUserDetail({
        _id: user.id,
        name: user.fullName,
        email: user.emailAddresses[0]?.emailAddress,
        imageUrl: user.imageUrl, // <-- use imageUrl instead of profileImageUrl
      });
    }
  }, [user]);

  return (
    <UserDetailContext.Provider value={{ userDetail, setUserDetail }}>
      {children}
    </UserDetailContext.Provider>
  );
};
