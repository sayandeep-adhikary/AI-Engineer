import { Link } from "react-router-dom";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      <h1>Not found</h1>
      <EmptyState
        title="This route doesn't exist"
        description="The page you're looking for isn't part of Signal."
        icon={<span style={{ fontSize: "1.5rem", color: "var(--text-faint)" }}>○</span>}
        action={
          <Link to="/">
            <Button variant="secondary">Back to Dashboard</Button>
          </Link>
        }
      />
    </div>
  );
}
