import { useMutation } from "convex/react";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const SaveInterviewQuestion = mutation({
  args: {
    questions: v.any(),
    uid: v.string(),       // <-- changed from v.id('UserTable') to v.string()
    resumeUrl: v.string()
  },
  handler: async (ctx, args) => {
    const result = await ctx.db.insert('InterviewSessionTable', {
      interviewQuestions: args.questions,
      resumeUrl: args.resumeUrl,
      userId: args.uid,    // store the Clerk id string
      status: 'darft'
    });
    return result;
  }
});

export const GetInterviewQuestions = query({
args: {
interviewRecordId: v.id('InterviewSessionTable'),
},
handler: async (ctx, args) => {
const result = await ctx.db.query('InterviewSessionTable')
.filter(q =>q.eq(q.field('_id'),args.interviewRecordId))
.collect();


return result[0];
}
})