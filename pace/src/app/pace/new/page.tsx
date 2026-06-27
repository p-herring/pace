import { PaceHeader } from "@/components/pace-header";
import { NewPlanForm } from "@/components/new-plan-form";

export default function NewPlan() {
  return (
    <main className="pace-app">
      <PaceHeader />
      <div className="pace-auth pace-auth-inner">
        <NewPlanForm />
      </div>
    </main>
  );
}
