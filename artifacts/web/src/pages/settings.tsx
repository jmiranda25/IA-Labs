import { useEffect } from "react";
import { Layout } from "@/components/layout";
import { useGetMe, useUpdateMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Settings, User } from "lucide-react";
import { useForm } from "react-hook-form";

export default function SettingsPage() {
  const { data: me, isLoading } = useGetMe();
  const updateMe = useUpdateMe();
  const qc = useQueryClient();
  const { toast } = useToast();

  const form = useForm<{ displayName: string; bio: string; location: string; website: string; skills: string }>({
    defaultValues: { displayName: "", bio: "", location: "", website: "", skills: "" },
  });

  useEffect(() => {
    if (me) {
      const m = me as any;
      form.reset({
        displayName: m.displayName ?? "",
        bio: m.bio ?? "",
        location: m.location ?? "",
        website: m.website ?? "",
        skills: (m.skills as string[])?.join(", ") ?? "",
      });
    }
  }, [me]);

  const onSubmit = (data: any) => {
    const skills = data.skills ? data.skills.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
    updateMe.mutate({ data: { ...data, skills } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
        toast({ title: "Profile updated", description: "Your changes have been saved." });
      },
    });
  };

  if (isLoading) return <Layout><div className="max-w-2xl mx-auto p-6"><Skeleton className="h-96 rounded-xl" /></div></Layout>;

  const m = me as any;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="h-6 w-6 text-primary" />Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your profile and account preferences.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4 text-primary" />Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="h-16 w-16">
                <AvatarImage src={m?.avatarUrl} />
                <AvatarFallback className="text-xl">{m?.displayName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{m?.displayName}</p>
                <p className="text-xs text-muted-foreground capitalize">{m?.role}</p>
              </div>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="displayName">Display Name</Label>
                <Input id="displayName" {...form.register("displayName")} data-testid="input-display-name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" rows={3} placeholder="Tell the community about yourself..." {...form.register("bio")} data-testid="input-bio" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" placeholder="City, Country" {...form.register("location")} data-testid="input-location" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" placeholder="https://..." {...form.register("website")} data-testid="input-website" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="skills">Skills (comma separated)</Label>
                <Input id="skills" placeholder="Python, LLMs, Computer Vision..." {...form.register("skills")} data-testid="input-skills" />
              </div>
              <Button type="submit" disabled={updateMe.isPending} data-testid="button-save-settings">
                {updateMe.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
