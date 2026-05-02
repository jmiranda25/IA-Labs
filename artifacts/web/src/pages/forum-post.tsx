import { Redirect } from "wouter";

export default function ForumPostPage(_props: { postId: string }) {
  return <Redirect to="/foro" />;
}
