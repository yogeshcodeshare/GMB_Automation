import { StubPage } from "@/components/shell/stub-page";
import { Card } from "@/components/ui/card";
import { SignOutButton } from "../dashboard/sign-out-button";

/** Account page ships Day 6 — sign-out stays available from M0 onwards. */
export default function AccountPage() {
  return (
    <section className="flex flex-col gap-4">
      <StubPage title="Account (admin)" day="Day 6" />
      <Card className="px-5 py-4">
        <div className="mb-3 text-[14.5px] font-bold">Session</div>
        <SignOutButton />
      </Card>
    </section>
  );
}
