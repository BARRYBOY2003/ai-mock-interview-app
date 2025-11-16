import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const CreateNewUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    imageUrl: v.string()
  },
  handler: async (ctx, args) => {
    // Check if the user already exists by email
    const users = await ctx.db
      .query('UserTable')
      .filter(q => q.eq(q.field('email'), args.email))
      .collect();

    // If user does not exist, insert and return them
    if (users?.length === 0) {
      const data = {
        email: args.email,
        imageUrl: args.imageUrl,
        name: args.name
      }
      const  result= await ctx.db.insert('UserTable', {
        ...data,     });
        console.log(result);
        return{
            ...data,
            result
        }

    }

    // If user exists, return the first match
    return users[0];
  }
});
