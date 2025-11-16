import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  UserTable: defineTable({
    name: v.string(),
    imageUrl: v.string(),
    email: v.string(),
  }),
  InterviewSessionTable: defineTable({
    interviewQuestions: v.any(),
    resumeUrl: v.string(),
    userId: v.string(),   // <-- changed from v.id('UserTable')
    status: v.string()
  })
});
