import React, { useContext, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ResumeUpload from "./ResumeUpload";
import JobDescription from "./JobDescription";
import { Loader2Icon } from "lucide-react";
import axios from "axios";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { UserDetailContext } from "@/context/UserDetailContext";
import { useRouter } from "next/navigation";

function CreateInterviewDialog() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { userDetail } = useContext(UserDetailContext);
  const saveInterviewQuestion = useMutation(api.Interview.SaveInterviewQuestion);
  const router=useRouter();

  const onHandleInputChange = (field: string, value: string) => {
    // Optional: handle JobDescription form inputs if needed
  };
const onSubmit = async () => {
  if (!file) return;
  if (!userDetail?._id) {
    console.error("User ID not found! Cannot save interview.");
    return;
  }

  setLoading(true);

  try {
    // 1️⃣ Upload resume & generate Q/A
    const form = new FormData();
    form.append("file", file);

    const resp = await axios.post("/api/generate-interview-questions", form);
    console.log("API Response:", resp.data);

    const questions = resp.data.output;
    const resumeUrl = resp.data.url;

    if (!questions || !resumeUrl) {
      console.error("Invalid response from backend", resp.data);
      return;
    }

    // 2️⃣ Save to Convex
    const saveResp = await saveInterviewQuestion({
      questions,
      resumeUrl,
      uid: userDetail._id,
    });

    console.log("Saved in Convex:", saveResp);

    // 3️⃣ Navigate to interview page
    router.push(`/interview/${saveResp}`);   // <── HERE!!
  } catch (e) {
    console.error("Error submitting interview:", e);
  } finally {
    setLoading(false);
  }
};

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="lg">+ Create Interview</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Please submit your resume</DialogTitle>
          <DialogDescription>
            Select your preferred method below and follow the instructions.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="resume-upload" className="w-full mt-5">
          <TabsList>
            <TabsTrigger value="resume-upload">Resume Upload</TabsTrigger>
            <TabsTrigger value="job-description">Job Description</TabsTrigger>
          </TabsList>

          <TabsContent value="resume-upload">
            <ResumeUpload setFiles={(file: File) => setFile(file)} />
          </TabsContent>

          <TabsContent value="job-description">
            <JobDescription onHandleInputChange={onHandleInputChange} />
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex gap-6">
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button onClick={onSubmit} disabled={loading || !file}>
            {loading ? <Loader2Icon className="animate-spin" /> : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreateInterviewDialog;
